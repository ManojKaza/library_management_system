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
    database: 'library',
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
function servehtml(pagepath, filepath) {
    app.get(pagepath, (req, res) => { res.sendFile(__dirname + '/public/' + filepath + '.html'); });
}
//Serving index page
servehtml('/', 'index');
//serving login page
app.get('/login', (req, res) => {
    const sessionID = req.cookies.session;
    if (session[sessionID]) {
        if (session[sessionID].u_role == 'admin') {
            res.redirect('/admin_home');
        }
        else {
            res.redirect('/user_home');
        }
    }
    else {
        res.sendFile(__dirname + '/public/login.html');
    }
});
//logout 
app.get('/logout', (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
});
//serving register page
servehtml('/register', 'register');
//Users login
app.post('/login', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    var userid;
    var query = 'SELECT * FROM users_login_details WHERE user_name = $1';
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
                const user_role = result.rows[0].role;
                const sessionID = (0, uuid_1.v4)();
                session[sessionID] = { u_name: username, u_id: userid, u_role: user_role };
                res.cookie(`session`, sessionID, {
                    maxAge: 10000 * 1000,
                    secure: true,
                    httpOnly: true,
                    sameSite: 'lax'
                });
                console.log("cookie set succesfully");
                res.redirect("/home");
            }
        }
    });
});
//serving admin home page
app.get('/home', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        const query = 'SELECT * FROM book_list';
        client.query(query, (err, result) => {
            if (usersession.u_role === 'admin') {
                res.render('a_booklist', { data: result.rows });
            }
            else {
                res.render('u_booklist', { data: result.rows });
            }
        });
    }
    else {
        res.redirect('/login');
    }
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
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        res.sendFile(__dirname + '/public/add_book.html');
    }
    else {
        res.redirect('/login');
    }
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
// users reserve
app.get('/home/reserve/:id', (req, res) => {
    const book_id = req.params.id;
    const query = 'SELECT book_stocks FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        var stocks = result.rows[0].book_stocks;
        if (stocks >= 1) {
            stocks -= 1;
            let date = (0, moment_1.default)().format('DD/MM/YYYY');
            const sessionID = req.cookies.session;
            const usersession = session[sessionID];
            const loaned_to = {};
            loaned_to[usersession.u_name] = { u_name: usersession.u_name, u_id: usersession.u_id, date_borrowed: date };
            const query1 = "UPDATE book_list SET loaned_to = $1,book_stocks = $2 WHERE b_id = $3;";
            client.query(query1, [loaned_to, stocks, book_id], (err1, result1) => {
                client.query('SELECT * FROM book_list WHERE b_id = $1', [book_id], (err2, result2) => {
                    const a = result2.rows[0].loaned_to[usersession.u_name].date_borrowed;
                    console.log(a);
                });
                res.redirect('/home');
            });
        }
    });
});
app.listen(3000);
