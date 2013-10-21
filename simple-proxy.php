<?php

require 'vendor/autoload.php';

use Guzzle\Http\Client;

$client = new Client('http://data.alexa.com');
$request = $client->get('/data', array(), array(
	'exceptions' => false,
));

// Forward the query string params from the request.
$request->getQuery()->replace($_GET);

$response = $request->send();

header(' ', true, $response->getStatusCode());

// Set the headers from the alexa API call.
foreach ($response->getHeaders() as $header) {
	header($header->getName().': '.$header->__toString(), true);
}

// Output the response from the alexa API call.
echo $response->getBody()->__toString();
