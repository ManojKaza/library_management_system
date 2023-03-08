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
function servehtml(pagepath, filepath) {
    app.get(pagepath, (req, res) => { res.sendFile(__dirname + '/public/' + filepath + '.html'); });
}
//Serving index page
servehtml('/', 'index');
//serving login page
servehtml('/login', 'login');
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
                console.log(session);
                if (result.rows[0].role === 'admin') {
                    res.redirect('/admin_home');
                }
                else {
                    res.redirect('/user_home');
                }
            }
        }
    });
});
//serving admin home page
app.get('/admin_home', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        res.sendFile(__dirname + '/public/admin_home.html');
    }
    else {
        res.json({ "result": "Invalid session or session expired" });
    }
});
//serving users home page
app.get('/user_home', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        res.sendFile(__dirname + '/public/user_home.html');
    }
    else {
        res.json({ "result": "Invalid session or session expired" });
    }
});
//users book list functions
app.get('/user_home/u_booklist', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        const query = 'SELECT * FROM book_list';
        client.query(query, (err, result) => {
            res.render('u_booklist', { data: result.rows });
        });
    }
    else {
        res.json({ "result": "Invalid session or session expired" });
    }
});
//user reserve a book
app.get('/user_home/reserve/:id', (req, res) => {
    const book_id = req.params.id;
    const query = 'SELECT book_stocks FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        var stocks = result.rows[0].book_stocks;
        if (stocks >= 1) {
            stocks -= 1;
            console.log(stocks);
            const query1 = 'UPDATE book_list SET book_stocks = $1 WHERE b_id = $2';
            client.query(query1, [stocks, book_id], (error1, result1) => {
                res.json({ message: "book reserved" });
            });
        }
        else {
            res.json({ message: "Thebook is out of stock" });
        }
    });
});
//admin book list functions
app.get('/admin_home/a_booklist', (req, res) => {
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (usersession) {
        const query = 'SELECT * FROM book_list';
        client.query(query, (err, result) => {
            res.render('a_booklist', { data: result.rows });
        });
    }
    else {
        res.json({ "result": "Invalid session or session expired" });
    }
});
//delete a book
app.get('/admin_home/delete/:id', (req, res) => {
    const book_id = req.params.id;
    const query = 'DELETE FROM book_list WHERE b_id = $1';
    client.query(query, [book_id], (err, result) => {
        res.json({ message: "The book is deleted" });
    });
});
app.post;
app.listen(3000);
