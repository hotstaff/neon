/*
 NEON - html builder
    Wrote by Hideto Manjo 2018
*/

/*jslint
    node, devel, bitwise, long
*/

"use strict";

/* Consts */
const CONST_DOCTYPE_AND_META = `<!DOCTYPE html>
<meta charset="UTF-8">
<meta name="generator" content="neon">`;

const CONST_HIGHTLIGHT_TAG = `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/monokai-sublime.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>`;

/* Import */
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

/* Global defines */
var SITE_JSON_NAME;
var SITE_JSON;
var INDEX_JSON;
var SOURCE_DIR;
var DEST_DIR;

/* Instance */
var watcher;

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
        console.log(err);
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
        if (err.code !== "ENOENT") {
            console.log(err);
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
    if (command !== null) {
        console.log("exec: " + command);
        exec(command, function (err, stdout) {
            if (err) {
                console.log(err);
            }
            console.log(stdout);
        });
        return true;
    }
    return false;
}
/* Common function end */

/* START UP CHECK START */
function setup_site_json() {
    SITE_JSON = {};
    SITE_JSON_NAME = path.resolve(process.argv[2]);
    if (isExistFile(SITE_JSON_NAME) === false) {
        if (isExistDir(SITE_JSON_NAME) === false) {
            console.log("Not Found (site.json) input filename ->" + SITE_JSON_NAME);
            process.exit(1);
        }
        SITE_JSON_NAME = path.resolve(SITE_JSON_NAME, "./site.json");
    }

    try {
        SITE_JSON = JSON.parse(fs.readFileSync(SITE_JSON_NAME, "utf8"));
    } catch (e) {
        console.log("JSON Parse Error site.json");
        console.log(e);
        process.exit(1);
    }

    /* Common configuration */
    INDEX_JSON = undefined;
    SOURCE_DIR = path.dirname(SITE_JSON_NAME);
    DEST_DIR = path.resolve(SOURCE_DIR, SITE_JSON.dest || "./");

    /* Dest dir check */
    if (isExistDir(DEST_DIR) === false) {
        console.log(`Dest filename already exists. (${DEST_DIR})`);
        process.exit(1);
    }
}

if (process.argv.length < 3) {
    console.log("Please input site.json.");
    process.exit(1);
}

setup_site_json();
console.log(`Source directory: ${SOURCE_DIR}`);
console.log(`Dest directory: ${DEST_DIR}`);

/* START UP CHECK END */

/* TEMPLETE START */
/* html templete builder
   these code shuld more smart.*/
const construct_index_html = function construct_index_html() {
    return `${CONST_DOCTYPE_AND_META}
<title>${SITE_JSON.title}</title>
<frameset cols="20%,80%" frameborder="no" border="0">
  <frame src="menu.html">
  <frame src="top.html" name="top">
</frameset>`;
};

const construct_menu_html = function construct_menu_html(index_json) {
    var pages = index_json.pages;
    var atags = "";

    pages.forEach(function (page) {
        if (page.source === "top.md") {
            return;
        }
        var link = page.source.replace(/.md/, ".html");
        atags = (
            atags + "<a href=\"" + link + "\" target=\"top\">"
            + page.title + "</a><br><br>\n"
        );
    });

    return `${CONST_DOCTYPE_AND_META}
${SITE_JSON.menu_head || SITE_JSON.head || ""}
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
};

const construct_page_html = function construct_page_html(md_html) {
    var highlight_tag = (
        md_html.match("class=\"hljs\"")
        ? CONST_HIGHTLIGHT_TAG
        : ""
    );
    return `${CONST_DOCTYPE_AND_META}${SITE_JSON.page_head || SITE_JSON.head || ""}
${highlight_tag}${md_html}
`;
};

/* html 5*/

const construct_menu_html5 = function construct_menu_html5(index_json) {
    var pages = index_json.pages;
    var litags = "";

    pages.forEach(function (page) {
        if (page.source === "top.md") {
            return;
        }
        var link = page.source.replace(/.md/, ".html");
        litags = (
            litags + "<li><a href=\"" + link + "\">"
            + "<i class=\"fa fa-file-text fa-fw\"></i>"
            + "<span>" + page.title + "</span></a></li>\n"
        );
    });

    return `
<div class="sidebar">
<header>${SITE_JSON.menutitle || "MENU"}</header>
<nav class="sidebar_nav">
<ul>
${litags}<li class="control">
<a href="top.html"><i class="fa fa-home fa-fw"></i><span class="">${SITE_JSON.toptitle || "TOP"}</span></a>
</li>
</ul>
</nav>
</div>
`;
};

const construct_page_html5 = function construct_page_html5(md_html, nav_html) {
    var highlight_tag = (
        md_html.match("class=\"hljs\"")
        ? CONST_HIGHTLIGHT_TAG
        : ""
    );
    return `${CONST_DOCTYPE_AND_META}
${SITE_JSON.page_head || SITE_JSON.head || ""}
${highlight_tag}
<body>${nav_html}
<main>
${md_html}</main>
</body>
`;
};


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

/*
  extnames is array object.
*/
const obtain_files = function obtain_files(dirname, extnames) {
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
/* TEMPLETE END */


/* MAIN FUNCTION STARTS */

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
                console.log("Resource converted.");
                onFulfilled(image_files);
            }
        ).catch(
            function (err) {
                console.log("Resource converted Error.");
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
                console.log("HTML generation succeeded!(all)");
                pages.forEach(function (page) {
                    page.write = true;
                });
                onFulfilled(pages);
            }
        ).catch(
            function (err) {
                console.log("HTML generation Error.");
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

                /*If the page title is changed in HTML 5 mode, all pages are rewritten.*/
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
                console.log("HTML generation succeeded!");
                onFulfilled(pages);
            }
        ).catch(
            function (err) {
                console.log("HTML generation Error.");
                onRejected(err);
            }
        );
    });
};

const write_html = function write_html(fname, html_text) {
    return new Promise(function (onFulfilled, onRejected) {
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
            console.log("Output classic frameset: index.html, menu.html");
            index_json.pages.forEach(function (page) {
                if (page.write === true) {
                    promises.push(
                        write_html(
                            path.resolve(DEST_DIR, page.source.replace(/.md/, ".html")),
                            construct_page_html(page.contents)
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
            console.log("Output HTML5 side menu: index.html, menu.html");
            var nav_html = construct_menu_html5(index_json);
            index_json.pages.forEach(function (page) {
                var page_html = construct_page_html5(
                    page.contents,
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

const post_script = function post_script(name) {
    return exec_script(SITE_JSON["post_" + name] || null);
};

/* MAIN FUNCTION END */

/* Main sequence */
const build = function build(md_file) {
    var start_time = Date.now();

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
            console.log("Pages:");
            index_json.pages.forEach(function (page) {
                console.log(
                    "  Source %s, title: %s, length: %s, write: %s",
                    page.source,
                    page.title,
                    page.contents.length,
                    page.write
                );
            });
            return index_json;
        }
    ).then(
        write_pages
    ).then(
        function onFulfilled(index_json) {
            INDEX_JSON = index_json;
            console.log("Time: " + Number(Date.now() - start_time) + " msec.");
        }
    ).then(
        function onFulfilled() {
            // The order means priority
            if (post_script("all")) {
                return;
            }
            if (post_script("add")) {
                return;
            }
            if (post_script("edit")) {
                return;
            }
        }
    ).catch(
        function onRejected(err) {
            console.error(err);
            // console.log("Stop");
            process.exit(1);
        }
    );
};


build();

/* EVENT WATCHER START */
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
/* EVENT WATCHER END */