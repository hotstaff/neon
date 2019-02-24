#!/usr/bin/env node
// NEON - html builder
//     Wrote by Hideto Manjo 2018

/*jslint
    node, devel, bitwise, long
*/
"use strict";


// Consts.

const CONST_DOCTYPE_HTML4 = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Frameset//EN" "http://www.w3.org/TR/html4/frameset.dtd">`;
const CONST_DOCTYPE_HTML5 = `<!doctype html>`;
const CONST_META_HTML4 = `<meta http-equiv="content-type" content="text/html; charset=UTF-8">
<meta name="generator" content="neon">`;
const CONST_META_HTML5 = `<meta charset="UTF-8">
<meta name="generator" content="neon">`;

const CONST_HIGHTLIGHT_TAG = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/monokai-sublime.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>
window.addEventListener("DOMContentLoaded", function() {
    hljs.initHighlightingOnLoad();
}, false);
</script>`;


// Options.

const OPTIONS_MINIFY = {
    collapseWhitespace: true,
    removeComments: true,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeAttributeQuotes: true,
    minifyCSS: true,
    minifyJS: true,
    html5: false
};


// Imports.

const program = require("commander");
const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;

const MD = require("markdown-it")({
    typographer: true,
    linkify: true
});

MD.use(
    require("markdown-it-title")
).use(
    require("markdown-it-emoji")
).use(
    require("markdown-it-ins")
).use(
    require("markdown-it-mark")
).use(
    require("markdown-it-footnote")
).use(
    require("markdown-it-deflist")
).use(
    require("markdown-it-abbr")
).use(
    require("markdown-it-sub")
).use(
    require("markdown-it-sup")
).use(
    require("markdown-it-container")
).use(
    require("markdown-it-highlightjs")
).use(
    require("markdown-it-imsize")
).use(
    require("markdown-it-link-attributes"),
    {
        attrs: {
            target: "_blank"
        }
    }
);

const gm = require("gm");
const pretty = require("pretty");
const minify = require("html-minifier").minify;


// Global defines.

var SITE_JSON_NAME;
var SITE_JSON;
var INDEX_JSON;
var SOURCE_DIR;
var DEST_DIR;


// Instance.

var watcher;


// Common function
// Defined at parsing time.

function isExistFile(file) {
    var stat;

    try {
        stat = fs.statSync(file);
    } catch (err) {
        if (err.code !== "ENOENT") {
        }
        return false;
    }

    if (stat.isFile() === false) {
        return false;
    }
    return true;
}


function isExistDir(dirname, creation = true) {
    var stat;

    try {
        stat = fs.statSync(dirname);
    } catch (err) {
        if (creation === false || err.code !== "ENOENT") {
            return false;
        }
    }

    if (creation) {
        try {
            fs.accessSync(dirname, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            if (error.code === "ENOENT") {
                fs.mkdirSync(dirname);
                return true;
            }
            return false;
        }
    }

    if (stat.isDirectory() === false) {
        return false;
    }
    return true;
}

function exec_script(command) {
    var zero = Date.now();
    if (command !== undefined && typeof command === "string") {
        console.log("  Executing command: " + command);
        exec(command, function (err, stdout) {
            if (err) {
                console.error(err);
            }
            console.log(stdout);
            console.log("  Execution ended. Command: %s.", command);
            console.log("  It took %d milliseconds to run.", Date.now() - zero);
        });
        return true;
    }
    return false;
}

// COMMON FUNCTION END

// START UP CHECK START

function setup_site_json() {

// Reset SITE_JSON.

    SITE_JSON = {};

    if (isExistFile(SITE_JSON_NAME) === false) {
        if (isExistDir(SITE_JSON_NAME, false) === false) {
            console.log("Read error of site.json.\n input path -> " + SITE_JSON_NAME);
            process.exit(1);
        }
        SITE_JSON_NAME = path.resolve(SITE_JSON_NAME, "./site.json");
    }

    try {
        SITE_JSON = JSON.parse(fs.readFileSync(SITE_JSON_NAME, "utf8"));
    } catch (e) {
        console.log("Parse error of site.json");
        console.error(e);
        process.exit(1);
    }

// Common configuration.

    INDEX_JSON = undefined;
    SOURCE_DIR = path.dirname(SITE_JSON_NAME);
    DEST_DIR = path.resolve(SOURCE_DIR, SITE_JSON.dest || "./");

// Dest dir check.

    if (isExistDir(DEST_DIR) === false) {
        console.log(`Dest filename already exists. (${DEST_DIR})`);
        process.exit(1);
    }

// Option switches.

    if (SITE_JSON.minify === true || SITE_JSON.html5 === true) {
        OPTIONS_MINIFY.html5 = true;
    } else {
        OPTIONS_MINIFY.html5 = false;
    }

}

program.name(
    "neon"
).arguments(
    "<site.json>"
).option(
    "--no-watch",
    "Disable event watching"
).option(
    "--no-exec",
    "Disable exec script"
).action(
    function (file) {
        SITE_JSON_NAME = path.resolve(file);
    }
);

program.parse(process.argv);

if (SITE_JSON_NAME === undefined) {
    console.log("Please input site.json.");
    console.log(program.helpInformation());
    process.exit(1);
}

console.log(`
oooo   oooo ooooooooooo  ooooooo  oooo   oooo
 8888o  88   888    88 o888   888o 8888o  88
 88 888o88   888ooo8   888     888 88 888o88
 88   8888   888    oo 888o   o888 88   8888
o88o    88  o888ooo8888  88ooo88  o88o    88
`);

setup_site_json();
console.log(`Site JSON path; ${SITE_JSON_NAME}`);
console.log(`Source directory: ${SOURCE_DIR}`);
console.log(`Dest directory: ${DEST_DIR}`);

// START UP CHECK END

// TEMPLETE START

// HTML templete builder
//      these code shuld more smart.

const for_each_tag = function for_each_tag(strings, values) {
// Template function for html tag making

//      strings[0] is head string.
//      strings[1] is tail string.
//      values is center string(String or Array or undefined).

    if (values === undefined) {
        return "";
    }

    if (typeof values === "string") {
        return strings[0] + values + strings[1] + "\n";
    }

    if (Array.isArray(values)) {
        return values.reduce(
            function (previous, value) {
                return previous + strings[0] + value + strings[1] + "\n";
            },
            ""
        );
    }

    return "";
};

const highlight_tag = function highlight_tag(md_html) {
    if (md_html.match("class=\"hljs")) {
        return CONST_HIGHTLIGHT_TAG + "\n";
    }
    return "";
};

const link_tag = function link_tag() {

// Link element.

    var tag = "";
    var css_path = "";

    tag = tag + for_each_tag`<link href="${SITE_JSON.css}" rel="stylesheet">`;

    if (SITE_JSON.payload_css !== undefined) {

        if (typeof SITE_JSON.payload_css === "string") {
            tag = tag + `<style>"${fs.readFileSync(css_path)}</style>` + "\n";
        }

        if (Array.isArray(SITE_JSON.payload_css)) {
            tag = tag + SITE_JSON.payload_css.reduce(
                function (previous, css) {
                    css_path = path.resolve(SOURCE_DIR, css);
                    if (isExistFile(css_path)) {
                        return previous + `<style>${fs.readFileSync(css_path)}</style>` + "\n";
                    }
                },
                ""
            );
        }
    }

    tag = tag + for_each_tag`<link rel="preload" as="style" href="${SITE_JSON.async_css}" type="text/css" media="all" onload="this.rel='stylesheet'">`;

    return tag;
};

const head_tag = function head_tag(title = "", plus_tag = "") {
    var meta_tag = (
        SITE_JSON.html5 === true
        ? CONST_META_HTML5
        : CONST_META_HTML4
    );
    var title_tag = (
        (title === "" || title === undefined)
        ? ""
        : `<title>${title}</title>`
    );
    var script_tag = for_each_tag`<script src="${SITE_JSON.js}"></script>`;

    return `<head>
${meta_tag}
${title_tag}
${link_tag()}${script_tag}${plus_tag}
</head>`;
};

const construct_index_html = function construct_index_html() {
    return `${CONST_DOCTYPE_HTML4}
${CONST_META_HTML4}
<title>${SITE_JSON.title}</title>
<frameset cols="20%,80%">
<frame src="menu.html" frameborder="0">
<frame src="top.html" name="top" frameborder="0">
</frameset>`;
};

const construct_menu_html = function construct_menu_html(index_json) {
    var atags = "";

    index_json.pages.forEach(function (page) {
        if (page.source === "top.md") {
            return;
        }
        var link = page.source.replace(/.md/, ".html");
        atags = atags + `<a href="${link}" target="top">${page.title}</a><br><br>` + "\n";
    });

    return `${CONST_DOCTYPE_HTML4}
${head_tag("Menu", (SITE_JSON.menu_head || SITE_JSON.head || ""))}
<body>
<center>
<hr>
<h2>${SITE_JSON.menutitle || "MENU"}</h2>
<hr>
<br>
${atags}<hr>
<a href="top.html" target="top">${SITE_JSON.toptitle || "TOP"}</a><br>
</center>
</body>
`;
};

const construct_page_html = function construct_page_html(page) {
    var head = head_tag(page.title, highlight_tag(page.contents) + (SITE_JSON.page_head || SITE_JSON.head || ""));
    return `${CONST_DOCTYPE_HTML4}
${head}
${page.contents}
`;
};

// html 5
const construct_menu_html5 = function construct_menu_html5(index_json) {
    var litags = "";

    index_json.pages.forEach(function (page) {
        if (page.source === "top.md") {
            return;
        }
        var link = page.source.replace(/.md/, ".html");
        litags = litags + `<li><a href="${link}"><i class="fa fa-file-text fa-fw"></i><span>${page.title}</span></a></li>` + "\n";
    });

    return `
<div class="menu">
<header>${SITE_JSON.menutitle || "MENU"}</header>
<nav class="menu_nav">
<ul>
${litags}<li class="control">
<a href="top.html"><i class="fa fa-home fa-fw"></i><span class="">${SITE_JSON.toptitle || "TOP"}</span></a>
</li>
</ul>
</nav>
</div>`;
};

const construct_page_html5 = function construct_page_html5(page, nav_html) {
    var head = head_tag(page.title, highlight_tag(page.contents) + (SITE_JSON.page_head || SITE_JSON.head || ""));
    return `${CONST_DOCTYPE_HTML5}
${head}
<body>${nav_html}
<main>
${page.contents}</main>
</body>
`;
};

// TEMPLETE END

const convert2html = function convert2html(file) {
    return new Promise(function (onFulfilled, onRejected) {
        fs.readFile(path.resolve(SOURCE_DIR, file), "utf8", function (err, md_text) {
            var ret = {};

            if (err) {
                return onRejected(err);
            }

            ret.source = file;
            ret.contents = MD.render(md_text, ret);

            return onFulfilled(ret);
        });
    });
};

const convert_image = function convert_image(file) {
    return new Promise(function (onFulfilled, onRejected) {
        var samnail_name = (
            path.basename(file, path.extname(file))
            + "_sum" + path.extname(file)
        );
        var sumnail_path = path.resolve(SOURCE_DIR, samnail_name);

        if (isExistFile(sumnail_path)) {
            return onFulfilled(file);
        }

        gm(path.resolve(SOURCE_DIR, file)).resize(300).noProfile().write(
            sumnail_path,
            function (err) {
                if (err) {
                    return onRejected(err);
                }
                return onFulfilled(file);
            }
        );
    });
};


const obtain_files = function obtain_files(dirname, extnames) {

// Extnames is array object.

    return new Promise(function (onFulfilled, onRejected) {
        fs.readdir(dirname, function (err, files) {
            var ret;

            if (err) {
                return onRejected(err);
            }

            ret = files.filter(
                function (file) {
                    var file_path = path.resolve(dirname, file);
                    return (
                        fs.statSync(file_path).isFile()
                        && extnames.indexOf(path.extname(file_path)) >= 0
                    );
                }
            );

            return onFulfilled(ret);
        });
    });
};

const obtain_markdown_files = function obtain_markdown_files(dirname) {
    return obtain_files(dirname, [".md"]);
};

const obtain_image_files = function obtain_image_files(dirname) {
    return obtain_files(dirname, [".jpg", ".png", ".gif"]);
};
// TEMPLETE END

// MAIN FUNCTION STARTS

const construct_index_json = function construct_index_json(pages) {
    return new Promise(function (onFulfilled) {
        var index_json = {
            pages: pages
        };

        onFulfilled(index_json);
    });
};

const shrink_resource = function shrink_resource() {
    return new Promise(function (onFulfilled, onRejected) {
        obtain_image_files(SOURCE_DIR).then(
            function (image_files) {
                return Promise.all(
                    image_files.filter(
                        function (file) {
                            return file.indexOf("_sum") < 0;
                        }
                    ).map(
                        function (file) {
                            return convert_image(file);
                        }
                    )
                );
            }
        ).then(
            function (image_files) {
                console.log("Resource conversion completed.");
                onFulfilled(image_files);
            }
        ).catch(
            function (err) {
                console.log("Resource conversion failed.");
                onRejected(err);
            }
        );
    });
};

const convert_md_all = function convert_md_all() {
    return new Promise(function (onFulfilled, onRejected) {
        obtain_markdown_files(SOURCE_DIR).then(
            function (md_files) {
                return Promise.all(
                    md_files.map(function (file) {
                        return convert2html(file);
                    })
                );
            }
        ).then(
            function (pages) {
                console.log("HTML conversion completed.");
                pages.forEach(function (page) {
                    page.write = true;
                });
                onFulfilled(pages);
            }
        ).catch(
            function (err) {
                console.log("HTML conversion failed.");
                onRejected(err);
            }
        );
    });
};

const convert_md = function convert_md(md_file) {
    if (md_file === undefined || INDEX_JSON === undefined) {
        return convert_md_all();
    }

    return new Promise(function (onFulfilled, onRejected) {
        convert2html(path.basename(md_file)).then(
            function (new_page) {
                var new_pages = INDEX_JSON.pages;
                var page_index = new_pages.findIndex(function (page) {
                    return new_page.source === page.source;
                });

                new_page.write = true;

// If the page title is changed in HTML 5 mode, all pages are rewritten.

                if (
                    SITE_JSON.html5 === true
                    && page_index > -1
                    && new_pages[page_index].title !== new_page.title
                ) {
                    new_pages.forEach(function (page) {
                        page.write = true;
                    });
                }

                if (page_index === -1) {
                    new_pages.push(new_page);
                } else {
                    new_pages[page_index] = new_page;
                }

                return new_pages;
            }
        ).then(
            function (pages) {
                console.log("HTML conversion completed.");
                onFulfilled(pages);
            }
        ).catch(
            function (err) {
                console.log("HTML conversion failed.");
                onRejected(err);
            }
        );
    });
};

const write_html = function write_html(fname, html_text) {
    return new Promise(function (onFulfilled, onRejected) {
        if (SITE_JSON.pretty === true) {
            html_text = pretty(html_text);
        } else if (SITE_JSON.minify === true) {
            html_text = minify(html_text, OPTIONS_MINIFY);
        }

        fs.writeFile(fname, html_text, function (err) {
            if (err) {
                return onRejected(err);
            }
            return onFulfilled(html_text);
        });
    });
};

const write_pages = function write_pages(index_json) {
    return new Promise(function (onFulfilled, onRejected) {
        var promises = [];

        if (SITE_JSON.html5 !== true) {
            console.log("Output a classical frame menu: index.html, menu.html");
            index_json.pages.forEach(function (page) {
                if (page.write === true) {
                    promises.push(
                        write_html(
                            path.resolve(DEST_DIR, page.source.replace(/.md/, ".html")),
                            construct_page_html(page)
                        )
                    );
                }
                page.write = false;
            });

            promises.push(
                write_html(
                    path.resolve(DEST_DIR, "menu.html"),
                    construct_menu_html(index_json)
                ),
                write_html(
                    path.resolve(DEST_DIR, "index.html"),
                    construct_index_html(index_json)
                )
            );

        } else {
            console.log("Output HTML5 navigation menu.: index.html = top.html");
            var nav_html = construct_menu_html5(index_json);
            index_json.pages.forEach(function (page) {
                var page_html = construct_page_html5(
                    page,
                    nav_html
                );

                if (page.source === "top.md") {
                    promises.push(
                        write_html(
                            path.resolve(DEST_DIR, "index.html"),
                            page_html
                        )
                    );
                }
                if (page.write === true) {
                    promises.push(
                        write_html(
                            path.resolve(DEST_DIR, page.source.replace(/.md/, ".html")),
                            page_html
                        )
                    );
                }
                page.write = false;
            });
        }

        Promise.all(
            promises
        ).then(
            function () {
                return onFulfilled(index_json);
            }
        ).catch(
            function (err) {
                return onRejected(err);
            }
        );
    });
};

const post_script = function post_script(names) {
// post_script
//     Execute while searching post script in order of priority.
//     Always returns false if all script names are undefined in site.json.
//     The order of the elements indicates the priority of the task to be executed.
//     If a task to be executed is found, the result is returned and the rest are not executed.
    if (program.exec) {
        if (Array.isArray(names)) {
            names.forEach(function (name) {
                if (SITE_JSON["post_" + name] !== undefined) {
                    console.log("Running scripts(post_" + name + ").");
                    return exec_script(SITE_JSON["post_" + name]);
                }
            });
        }
    }

    return false;
};

// MAIN FUNCTION END

// MAIN SEQUENCE

const build = function build(md_file) {
    var start_time = Date.now();
    console.log("Neon build process started.");

    Promise.resolve().then(
        shrink_resource
    ).then(
        function onFullfilled() {
            return md_file;
        }
    ).then(
        convert_md
    ).then(
        construct_index_json
    ).then(
        function onFulfilled(index_json) {
            console.log("Page Details:");
            index_json.pages.forEach(function (page) {
                console.log(
                    "    [%s] %s: \"%s\", %s Bytes",
                    (
                        page.write
                        ? "✔"
                        : " "
                    ),
                    page.source,
                    page.title,
                    Buffer.byteLength(page.contents)
                );
            });
            return index_json;
        }
    ).then(
        write_pages
    ).then(
        function onFulfilled(index_json) {
            INDEX_JSON = index_json;
            console.log("The build process ended in " + Number(Date.now() - start_time) + " milliseconds.");
        }
    ).then(
        function onFulfilled() {
            // The order means priority
            post_script(["all", "add", "edit"]);
        }
    ).catch(
        function onRejected(err) {
            console.error(err);
            process.exit(1);
        }
    );
};


build();


// EVENT WATCHER START

if (program.watch) {
    watcher = chokidar.watch([SOURCE_DIR, SITE_JSON_NAME], {
        ignored: /[\/\\]\./,
        persistent: true
    });

    watcher.on("ready", function () {

        watcher.on("add", function (file_path) {
            if (path.extname(file_path) === ".md") {
                console.log(file_path + " added.");
                build();
            }
        });

        watcher.on("change", function (file_path) {
            if (path.extname(file_path) === ".md") {
                console.log(file_path + " changed.");
                build(file_path);
            }

            if (file_path === SITE_JSON_NAME) {
                console.log(file_path + " changed.");
                setup_site_json();
                build();
            }
        });

        watcher.on("error", function (error) {
            console.error(error);
        });
    });
}
// EVENT WATCHER END