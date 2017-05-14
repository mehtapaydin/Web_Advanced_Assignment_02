var express = require('express')
var path = require('path')
var logger = require('morgan')
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')

var http = require("https");

var fs = require('fs');
var util = require('util');
var mime = require('mime');
var multer = require('multer');
var uploadDestination = multer({dest: 'uploads/'});
require('dotenv').config();

var index = require('./routes/index')
var port = 8080

var app = express()
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', index)

// TRANSLATE CODE starts

app.post('/translate', function (req, res, next) {

	console.log(req.body);
    console.log('request =' + JSON.stringify(req.body))

	var text = req.body.text
	var source = req.body.source
	var target = req.body.target

	console.log(text)
    console.log(source)
    console.log(target)

	translate(text, source, target, function(result) {
        var returnedData = result
        console.log('translatedText: ' + returnedData.data.translations[0].translatedText);
        // you can return only the translatedText, we are returning all of them.
        res.send(returnedData)
    });
})

function translate(text, source, target, callback) {

    //TODO: you can change key with yours, if you want.
    var apikey = process.env.API_KEY
    var url = 'https://www.googleapis.com/language/translate/v2?key=' + apikey + '&q=' + text + '&source=' + source + '&target=' + target

    http.get(url, function(res) {

        const statusCode = res.statusCode;
        const contentType = res.headers['content-type'];

        var error;
        if (statusCode !== 200) {
            error = new Error('Request Failed.\n' + 'Status Code: ' + statusCode);
        } else if (!/^application\/json/.test(contentType)) {
            error = new Error('Invalid content-type.\n' + 'Expected application/json but received ' + contentType);
        }

        if (error) {
            console.log(error.message);
            // consume response data to free up memory
            res.resume();
            return;
        }

        res.setEncoding('utf8');
        var rawData = '';

        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            rawData += chunk;
        });

        res.on('end', function () {
            try {
                console.log('rawData: ' + rawData)
                var parsedData = JSON.parse(rawData);
                callback(parsedData)
            } catch (e) {
                console.log(e.message);
            }
        });


    }).on('error', function (e) {
        console.log('Got error: ' + e.message);
	});

}
// TRANSLATE CODE ends

// VISION CODE starts

// npm install --save @google-cloud/vision
//https://googlecloudplatform.github.io/google-cloud-node/#/docs/google-cloud/0.50.0/google-cloud
//https://github.com/GoogleCloudPlatform/google-cloud-node
//export GOOGLE_APPLICATION_CREDENTIALS='./keyfile.json'
var config = {
    projectId: 'cloudvisionfirsttest',
    keyFilename: './keyfile.json'
};

var vision = require('@google-cloud/vision')(config);


// Simple upload form
var form = '<!DOCTYPE HTML><html><body>' +
    "<form method='post' action='/uploadPhoto' enctype='multipart/form-data'>" +
    "<input type='file' name='image'/>" +
    "<input type='submit' /></form>" +
    '</body></html>';

// Upload endpoint: http://localhost:8080/upload
app.get('/upload', function(req, res) {
    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
    });
    res.end(form);
});


// Get the uploaded image
// Image is uploaded to req.file.path
app.post('/uploadPhoto', uploadDestination.single('image'), function(req, res, next) {

    // Choose what the Vision API should detect
    // Choices are: faces, landmarks, labels, logos, properties, safeSearch, texts
    var types = ['labels', 'text', 'faces'];

    // Send the image to the Cloud Vision API
    vision.detect(req.file.path, types, function(err, detections, apiResponse) {
        if (err) {
            res.end('Cloud Vision Error');
        } else {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });
            res.write('<!DOCTYPE HTML><html><body>');

            // Base64 the image so we can display it on the page
            res.write('<img width=640 src="' + base64Image(req.file.path) + '"><br>');

            // Write out the JSON output of the Vision API
            //res.write(JSON.stringify(detections, null, 4));

            console.log(detections);
            console.log(detections.labels);
            console.log(detections.text[0]);
            console.log(detections.faces);

            var textOnThePicture = detections.text[0]

            translate(textOnThePicture, 'en', 'es', function(result) {
                var returnedData = result
                var translatedText = returnedData.data.translations[0].translatedText
                console.log('translatedText: ' + translatedText);
                // you can return only the translatedText, we are returning all of them.
                res.write('labels:'+ detections.labels + '</b>');
                res.write('translatedText:'+ translatedText + '</b>');
                res.end('</body></html>');

            });

            // Delete file (optional)
            fs.unlinkSync(req.file.path);

            //res.end('</body></html>');
        }
    });
});

function base64Image(src) {
    var data = fs.readFileSync(src).toString('base64');
    return util.format('data:%s;base64,%s', mime.lookup(src), data);
}

// VISION CODE ends

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found')
	err.status = 404
	next(err)
})

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get('env') === 'development' ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render('error')
})

module.exports = app

app.listen(port, function() {
	console.log('App listening at port: ' + port)
})
