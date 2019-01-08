/*
 NEON - html builder
    Wrote by Hideto Manjo 2018
*/

/*jslint node: false */
/*jslint stupid: false */

"use strict";
// time variable
var start_time;

/* Defines */
var SITE_JSON_NAME;
var SITE_JSON;
var SOURCE_DIR;
var DEST_DIR;
var POST_EDIT;

/* Instance */
var watcher;

/* Import */
var chokidar = require("chokidar");
var fs = require("fs");
var path = require("path");
var exec = require('child_process').exec;

var MD = require('markdown-it')({
    typographer: true,
    linkify: true,
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
    .use(require('markdown-it-highlightjs'))
    .use(require('markdown-it-imsize'))
    .use(require('markdown-it-link-attributes'), {
        attrs: {
            target: '_blank',
        }
    });

var gm = require('gm');


console.log(`

oooo   oooo ooooooooooo  ooooooo  oooo   oooo 
 8888o  88   888    88 o888   888o 8888o  88  
 88 888o88   888ooo8   888     888 88 888o88  
 88   8888   888    oo 888o   o888 88   8888  
o88o    88  o888ooo8888  88ooo88  o88o    88 
                                             
`);


/* Common function
    Defined at parsing time. */
function isExistFile(file) {
    var stat;

    try {
        stat = fs.statSync(file);
    } catch (err) {
        return false;
    }

    if (stat.isFile() === false){
        return false;
    }
    return true;
}


function isExistDir(dirname, creation=true) {
    var stat;

    try {
        stat = fs.statSync(dirname);
    } catch(err) {
        return false;
    }

    if(stat.isDirectory() === false){
        return false;
    }

    if (creation) {
        try{
            fs.accessSync(dirname, fs.constants.R_OK | fs.constants.W_OK);
        }catch(error) {
            if (error.code === "ENOENT") {
                fs.mkdirSync(dirname);
                return true;
            }
            return false;
        }    
    }
    return true;
}

function exec_script(command) {
    if (command !== null) {
        console.log(`Exec: ${command}`);
        const result =  exec(command, function(err, stdout, stderr) {
            if (err) console.log(err)
                console.log(stdout);
            });
    }
}
/* Common function end */

/* START UP CHECK START */
if (process.argv.length < 3) {
    console.log("Please input site.json.");
    process.exit(1);
}

SITE_JSON_NAME = path.resolve(process.argv[2]);
SITE_JSON = {};

/* Read SITE.json */
if (isExistFile(SITE_JSON_NAME) === false) {
    if (isExistDir(SITE_JSON_NAME) === false) {
        console.log("Not Found (site.json) input filename ->" + SITE_JSON_NAME);
        process.exit(1);
    }
    SITE_JSON_NAME = path.resolve(SITE_JSON_NAME, "./site.json");
}


try{
    SITE_JSON = JSON.parse(fs.readFileSync(SITE_JSON_NAME, 'utf8'));    
} catch(e) {
    console.log("JSON Parse Error site.json");
    console.log(e);
    process.exit(1);
}

/* Common configuration */
SOURCE_DIR = path.dirname(SITE_JSON_NAME);
DEST_DIR =  path.resolve(SOURCE_DIR, SITE_JSON.dest || "./") ;

POST_EDIT = SITE_JSON.post_edit || null;

/* Dest dir check */
if (isExistDir(DEST_DIR) === false) {
    console.log(`Dest filename already exists. (${DEST_DIR})`);
    process.exit(1);
}
console.log(`Source directory: ${SOURCE_DIR}`);
console.log(`Dest directory: ${DEST_DIR}`);
/* START UP CHECK END */

/* TEMPLETE START */
/* html templete builder 
   these code shuld more smart.*/
var construct_index_html = function construct_index_html(index_json) {
    return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">
<title>${SITE_JSON.title}</title>
<frameset cols="20%,80%" frameborder="no" border="0">
  <frame src="menu.html">
  <frame src="top.html" name="top">
</frameset>`;
}

var construct_menu_html = function construct_menu_html(index_json) {
    var pages = index_json.pages,
        atags = "";

    pages.forEach(function(page) {
        if (page.source === "top.md") return;
        var link = page.source.replace(/.md/, ".html");
        atags =  atags  + `<a href="${link}" target="top">${page.title}</a><br><br>\n`;
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
${atags}<hr>
<a href="top.html" target="top">${SITE_JSON.toptitle || "TOP"}</a><br>
</center>
`;
}

var construct_page_html = function construct_page_html(md_html) {
    var highlight = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/monokai-sublime.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>`
    return `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">
${md_html.match("class=\"hljs\"") ? highlight : ""}${md_html}
`;
}


var convert2html = function convert2html(file) {
    return new Promise(function(onFulfilled, onRejected) {
        fs.readFile(path.resolve(SOURCE_DIR, file), "utf8", function(err, md_text){
            var ret = {};
            if (err) return onRejected(err);
            fs.writeFile(path.resolve(DEST_DIR, file.replace(/.md/, ".html")), 
                         construct_page_html(MD.render(md_text, ret)),
                         function(err){
                if (err) return onRejected(err);
                ret.source = file;
                onFulfilled(ret);
            });
        })
    })
}

var convert_image = function convert_image(file) {
    return new Promise(function(onFulfilled, onRejected) {
        var samnail_name = path.basename(file, path.extname(file)) + "_sum" + path.extname(file),
            sumnail_path = path.resolve(SOURCE_DIR, samnail_name);

        if (isExistFile(sumnail_path)) {
            return onFulfilled(file);
        }

        gm(path.resolve(SOURCE_DIR, file)).resize(300)
            .noProfile()
            .write(sumnail_path, function (err) {
                if (err) return onRejected(err);
                onFulfilled(file);
            });
    });
}

/*
  extnames is array object.
*/
var obtain_files = function obtain_markdown_files (dirname, extnames) {
    return new Promise(function(onFulfilled, onRejected) {
        fs.readdir(dirname, function(err, files) {
            if (err) return onRejected(err);
            onFulfilled(files.filter(function(file){
                var file_path = path.resolve(dirname, file);
                return fs.statSync(file_path).isFile() && 
                    extnames.indexOf(path.extname(file_path)) >= 0; //絞り込み
            }));
        });
    });
}

var obtain_markdown_files = function obtain_markdown_files (dirname) {
    return obtain_files(dirname, [".md"]);
}

var obtain_image_files = function obtain_image_files (dirname) {
    return obtain_files(dirname, [".jpg", ".png", ".gif"])
}
/* TEMPLETE END */


/* MAIN FUNCTION STARTS */

var construct_index_json = function construct_index_json (md_files) {
    return new Promise(function(onFulfilled, onRejected) {
        var index_json = {
            pages:[]
        }
        md_files.forEach(function(md_file) {
            index_json.pages.push({title: md_file.title, source: md_file.source})
        });
        
        onFulfilled(index_json);
    });
}

var shrink_resource = function shrink_resource() {
    return new Promise(function(onFulfilled, onRejected) {
        obtain_image_files(SOURCE_DIR).then(function(image_files){
            return Promise.all(image_files.filter(function(file){
                return file.indexOf("_sum") < 0;
            }).map(function(file){
                return convert_image(file);
            }));
        }).then(
            function(image_files){
                console.log("Resource converted.");
                onFulfilled(image_files);
            },
            function(err){
                console.log(err.message);
                onRejected("Resource converted Error.");
            }
        );
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
                console.log("HTML generation succeeded!");
                onFulfilled(md_files);
            },
            function(err){
                console.log(err.message);
                onRejected("HTML generation Error.");
            })
    });
}


var write_html = function write_html(fname, html_text) {
    return new Promise(function (onFulfilled, onRejected) {
        fs.writeFile(fname, html_text, function(err){
                if (err) return onRejected(err);
                onFulfilled(html_text);
            });
    });
}

/* MAIN FUNCTION END */

/* Main sequence */
var build_all = function build_all(){
    start_time = Date.now();
    Promise.resolve()
    .then(shrink_resource)
    .then(convert_all)
    .then(construct_index_json)
    .then(function(index_json){
        console.log(index_json);
        write_html(path.resolve(DEST_DIR, "menu.html"), construct_menu_html(index_json));
        write_html(path.resolve(DEST_DIR, "index.html"), construct_index_html(index_json));
        return index_json;
    })
    .then(function(){
        console.log("Time: " + Number(Date.now() - start_time) + " msec.");
    }).then(function(){
        exec_script(POST_EDIT);
    })
};


build_all();

/* EVENT WATCHER START */
watcher = chokidar.watch(SOURCE_DIR,{
    ignored:/[\/\\]\./,
    persistent:true
});

watcher.on('ready',function(){

    watcher.on('add',function(file_path){
        if (path.extname(file_path) === ".md") {
            console.log(file_path + " added.");
            build_all();
            exec_script(POST_EDIT);
        }
    });

    watcher.on('change',function(file_path){
        if (path.extname(file_path) === ".md") {
            console.log(file_path + " changed.");
            build_all();
            exec_script(POST_EDIT);
        }
    });
});
/* EVENT WATCHER END */

