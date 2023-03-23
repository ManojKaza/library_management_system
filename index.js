"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const pg_1 = require("pg");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const uuid_1 = require("uuid");
const moment_1 = __importDefault(require("moment"));
const app = (0, express_1.default)();
const client = new pg_1.Client({
    host: 'localhost',
    user: 'manoj',
    database: 'Library',
    password: 'Admin',
    port: 5432,
});
client.connect();
app.set('view engine', 'ejs');
const session = {};
//body parser middleware
app.use(body_parser_1.default.urlencoded({ extended: false }));
//cookie parser middleware
app.use((0, cookie_parser_1.default)());
//serving static files
app.use(express_1.default.static('public/styles'));
//session id verification middleware
app.use('/home', (req, res, next) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (!usersession) {
        res.redirect('/login');
    }
    else {
        next();
    }
});
// function for serving html
function servehtml(pagepath, filepath) {
    app.get(pagepath, (req, res) => { res.sendFile(__dirname + '/public/' + filepath + '.html'); });
}
//Serving index page
servehtml('/', 'index');
//serving login page
app.get('/login', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (!usersession) {
        res.sendFile(__dirname + '/public/login.html');
    }
    else {
        res.redirect('/home');
    }
});
//logout 
app.get('/logout', (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
});
//serving register page
servehtml('/register', 'register');
//serving about us page
servehtml('/about_us', 'about_us');
//Users login
app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var userid;
    var query = 'SELECT * FROM users WHERE username = $1';
    client.query(query, [username], (err, result) => {
        if (result.rowCount == 0) {
            res.json({ "result": "Invalid username,Please try again" });
        }
        else {
            if (result.rows[0].password != password) {
                res.json({ "result": "You have entered invalid password, Please try again with correct password." });
            }
            else if (result.rows[0].password === password) {
                userid = result.rows[0].u_id;
                const user_role = result.rows[0].u_role;
                const sessionID = (0, uuid_1.v4)();
                session[sessionID] = { u_name: username, u_id: userid, u_role: user_role };
                res.cookie(`session`, sessionID, {
                    maxAge: 10000 * 1000,
                    secure: true,
                    httpOnly: true,
                    sameSite: 'lax'
                });
                res.redirect("/home");
            }
        }
    });
});
//serving admin home page
app.get('/home', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    const u_name = usersession.u_name;
    if (usersession.u_role === 'admin') {
        const query = 'SELECT * FROM book_list';
        client.query(query, (err, result) => {
            res.render('a_booklist', { data: result.rows });
        });
    }
    else {
        const query = "SELECT b_id,book_name,loaned_to FROM book_list WHERE loaned_to->$1 IS NOT NULL";
        client.query(query, [u_name], (err, result) => {
            res.render('u_return', { data: result.rows, u_name });
        });
    }
});
//resrve book
app.get('/home/reserve', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    const u_name = usersession.u_name;
    const query = "SELECT * FROM book_list";
    client.query(query, (err, result) => {
        res.render('u_reserve', { data: result.rows, u_name });
    });
});
// users reserve
app.get('/home/reserve/:id', (req, res) => {
    const book_id = req.params.id;
    const query = 'SELECT book_stocks,loaned_to FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        var stocks = result.rows[0].book_stocks;
        const sessionID = req.cookies.session;
        const usersession = session[sessionID];
        if (stocks >= 1 && !result.rows[0].loaned_to[usersession.u_name]) {
            stocks -= 1;
            let date = (0, moment_1.default)().format('DD/MM/YYYY');
            const loaned_to = result.rows[0].loaned_to;
            loaned_to[usersession.u_name] = { u_name: usersession.u_name, u_id: usersession.u_id, date_borrowed: date };
            const query1 = "UPDATE book_list SET loaned_to = $1,book_stocks = $2 WHERE b_id = $3;";
            client.query(query1, [loaned_to, stocks, book_id], (err1, result1) => {
                res.redirect('/home');
            });
        }
        else {
            res.json({ message: "You have already reserved the book" });
        }
    });
});
//return a book
app.get('/home/return/:id', (req, res) => {
    const book_id = req.params.id;
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    const query = 'SELECT * FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        const u_name = usersession.u_name;
        delete result.rows[0].loaned_to[u_name];
        let stocks = result.rows[0].book_stocks + 1;
        const query1 = 'UPDATE book_list SET loaned_to = $1,book_stocks = $2 WHERE b_id = $3';
        const a = result.rows[0].loaned_to;
        client.query(query1, [a, stocks, book_id], (err1, result1) => {
            res.redirect('/home');
        });
    });
    // const query:string = 'UPDATE book_list SET loaned_to->$1 = $2 WHERE b_id = $3'
    // client.query(query,[usersession.u_name,false,book_id],(err,result) =>{
    //   res.redirect('/home');
    // })
});
//edit a book
app.get('/home/book_view/:id', (req, res) => {
    const query = 'SELECT * FROM book_list WHERE b_id = $1';
    client.query(query, [req.params.id], (err, result) => {
    });
});
//delete a book
app.get('/home/delete/:id', (req, res) => {
    const book_id = req.params.id;
    const query = 'DELETE FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        res.redirect('/home');
    });
});
//serving add a book
app.get('/home/add_book', (req, res) => {
    res.sendFile(__dirname + '/public/add_book.html');
});
//add a book
app.post('/home/add_book', (req, res) => {
    const bname = req.body.book_name;
    const isbn = req.body.isbn_number;
    const author = req.body.author_name;
    const edition = req.body.book_edition;
    const publ = req.body.publication;
    const stocks = req.body.book_stocks;
    const query = 'SELECT * FROM book_list WHERE book_name = $1 OR isbn_number = $2';
    client.query(query, [bname, isbn], (err, result) => {
        if (result.rowCount === 0) {
            const query1 = "INSERT INTO book_list (book_name,isbn_number,author_name,book_edition,publication,book_stocks) VALUES ($1,$2,$3,$4,$5,$6)";
            client.query(query1, [bname, isbn, author, edition, publ, stocks], (err1, result1) => {
                res.redirect('/home');
            });
        }
        else {
            res.json({ message: "The book or isbn code already exists." });
        }
    });
});
app.listen(3000);
