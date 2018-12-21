/*
 NEON - html builder
    Wrote by Hideto Manjo
*/

/*jslint node: true */

"use strict";
var fs = require("fs");
var path = require("path");

var MD = require('markdown-it')({
    typographer: true,
});
MD.use(require('markdown-it-title'))
  .use(require('markdown-it-emoji'))
  .use(require('markdown-it-ins'))
  .use(require('markdown-it-mark'))
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-deflist'))
  .use(require('markdown-it-abbr'))
  .use(require('markdown-it-sub'))
  .use(require('markdown-it-sup'))
  .use(require('markdown-it-container'))
  .use(require('markdown-it-highlightjs'));


// define
if (process.argv.length < 3) {
    console.log("Please input site.json.")
    process.exit(1);
}
var SITE_JSON_NAME = process.argv[2];
var LOAD_SITE_JSON = false;

// common function
function isExistFile(file) {
    try {
        fs.statSync(file);
        return true
    } catch(err) {
        if(err.code === 'ENOENT') return false
    }
}

function isExistDir(dirname) {

    if (fs.existsSync(dirname) && fs.statSync(dirname).isDirectory() === false) {
        return false;
    }
    console.log(dirname)
    fs.access(dirname, fs.constants.R_OK | fs.constants.W_OK, function(error){
        if (error) {
            if (error.code === "ENOENT") {
                fs.mkdirSync(dirname);
            }
        }
    });
    return true;
}

// Read SITE.json
if (SITE_JSON_NAME !== undefined && isExistFile(SITE_JSON_NAME)){
   var SITE_JSON = JSON.parse(fs.readFileSync(SITE_JSON_NAME, 'utf8'));
   LOAD_SITE_JSON = true;
}else{
    console.log("Not Found (site.json) input filename ->" + SITE_JSON_NAME );
    process.exit(1);
}

// common configuration
var SITE_JSON = SITE_JSON || {};
var SOURCE_DIR = path.dirname(path.resolve(LOAD_SITE_JSON ? SITE_JSON_NAME : ".")) + "/";
var DEST_DIR =  path.resolve(SOURCE_DIR + SITE_JSON.dest || ".") + "/";

// dest dir check
if (isExistDir(DEST_DIR)) {
    console.log("Source directory: " + SOURCE_DIR);
    console.log("Dest directory: " + DEST_DIR);
} else {
    console.log("Dest name file is already exists." + DEST_DIR);
    process.exit(1);
}

// START UP CHECK END

// TEMPLETE START

/* html templete builder 
   these code shuld more smart.*/
var construct_index_html = function construct_index_html(index_json) {
    return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">
<title>${SITE_JSON.title}</title>
<frameset cols="20%,80%" frameborder="no" border="0">
  <frame src="menu.htm">
  <frame src="top.htm" name="top">
</frameset>`;
}

var construct_menu_html = function construct_menu_html(index_json) {
    var pages = index_json.pages;
    var atags = "";
    pages.forEach(function(page) {
        if (page.source === "top.md") {
            return ;
        }
        var link = page.source.replace(/.md/, ".htm");
        var pagetitle = page.title;
        atags =  atags  + `<a href="${link}" target="top">${pagetitle}</a><br><br>\n`;
    })
        
    return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">
<title>menu</title>
<center>
<hr>
<h2>${SITE_JSON.menutitle || "MENU"}</h2>
<hr>
<br>
${atags}
<hr>
<a href="top.htm" target="top">TOP</a><br>
</center>
`;
}

var construct_page_html = function construct_page_html(md_html) {
    return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/monokai-sublime.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>
${md_html}
`;
}


var convert2html = function convert2html(file) {
    return new Promise(function(onFulfilled, onRejected) {
        fs.readFile(SOURCE_DIR + file, "utf8", function(err, md_text){
            if (err) onRejected("Convert failure(read): " + file);
            var ret = {};
            fs.writeFile(DEST_DIR + file.replace(/.md/, ".htm"), construct_page_html(MD.render(md_text, ret)), function(err){
                if (err) onRejected("Convert failure(write): " + file);
                ret.source = file;
                onFulfilled(ret);
            });
        })
    })
}

var obtain_markdown_files = function obtain_markdown_files (dirname) {
    return new Promise(function(onFulfilled, onRejected) {
        fs.readdir(dirname, function(err, files) {
            if (err) {
                onRejected("Do not obtain markdown: " + dirname);
            }
            onFulfilled(files.filter(function(file){
                return fs.statSync(dirname + file).isFile() && /.*\.md$/.test(dirname + file); //絞り込み
            }));
        });
    });
}
// TEMPLETE END


// MAIN FUNCTION STARTS
var construct_index_json = function construct_index_json (md_files) {
    return new Promise(function(onFulfilled, onRejected) {
        var index_json = {
            pages:[]
        }
        md_files.forEach( function(md_file) {
            index_json.pages.push({title: md_file.title, source: md_file.source})
        });
        
        onFulfilled(index_json);
    });
}

var convert_all = function convert_all() {
    return new Promise(function(onFulfilled, onRejected) {
        obtain_markdown_files(SOURCE_DIR).then(function(md_files) {
            return Promise.all(md_files.map(function(file){
                return convert2html(file);
            }));
        }).then(
            function(md_files){
                console.log("Converted!!");
                onFulfilled(md_files);
            },
            function(err){
                console.log(err.message);
                onRejected("Error.");
            })
    });
}

var write_html = function write_html(fname, html_text) {
    return new Promise(function (onFulfilled, onRejected) {
        fs.writeFile(fname, html_text, function(err){
                if (err) onRejected("Error write html: " + fname);
                onFulfilled(html_text);
            });
    });
}

/* main sequence */
Promise.resolve()
    .then(convert_all)
    .then(construct_index_json)
    .then(function(index_json){
        console.log(index_json);
        write_html(DEST_DIR + "menu.htm", construct_menu_html(index_json));
        write_html(DEST_DIR + "index.htm", construct_index_html(index_json));
        return index_json;
    })
