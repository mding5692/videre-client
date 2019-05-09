build:
	node_modules/.bin/browserify src/videre-client.js -o dist/videre-client.bundle.js -t [ babelify --presets [ es2015 ] ]

build-test:
	node_modules/.bin/browserify test/videre-client-test.js -o test/videre-client-test.bundle.js -t [ babelify --presets [ es2015 ] ]
