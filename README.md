# autocruise
slide and tile views of web pages


### Description
This is a single-file JavaScript library without any external dependencies.
Create an HTML file that includes a list of <a>'s to cruise, with this script in <script>,
then the <body> will be replaced with autocruise contents.


Example making an autocruise page:
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <title>Autocruise</title>
    <script type="text/javascript" src="autocruise.js"></script>
  </head>

  <body autocruise-interval="10">
    <a href="page1.url">page 1
    <a href="page2.url">page 2
    <a href="page3.url">page 3
    ...
  </body>
</html>
```
            
Alternatively, pages can be defined in an external configuration file, which is specified in URL
   https://.../autocruise.html?config=URL_TO_CONFIG_JSON
In this case, the HTML body can be empty.

The JSON file should look like:
```
{
    "title": "My Autocruise",
    "interval": 60,
    "pages": [
        "page1.url",
        "page2.url"
    ]
}
```

Autocruise has several parameters, such as "interval". 
Parameter values can be specified by:
- config file
- "autocruise-NAME" attribute to the <body> element
- URL parameter, NAME=VALUE

Currently defined parameters are:
- interval: cycle view switch intervals, in seconds
- view: initial view mode, "cycle" (default) or "tile"
