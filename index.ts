import express, { query } from 'express';
import bodyParser from 'body-parser';
import { Client } from 'pg';
import cookieParser from 'cookie-parser';
import { v4 } from 'uuid';
import moment,{Moment} from 'moment'

const app = express();

const client = new Client({
  host: 'localhost',
  user: 'manoj',
  database: 'Library',
  password: 'Admin',
  port: 5432,
})
const client1 = new Client({
  host: 'localhost',
  user: 'manoj',
  database: 'Audit',
  password: 'Admin',
  port: 5432,
})
client.connect();
client1.connect();

app.set('view engine','ejs')

const session:{[uuid:string]:{u_name:string,u_id:number,u_role:string}} = {};

//body parser middleware
 app.use(bodyParser.urlencoded({ extended: false }));
//cookie parser middleware
 app.use(cookieParser());
//serving static files
 app.use(express.static('public/styles'))
//session id verification middleware
 app.use('/home',(req,res,next)=>{
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if(!usersession){
    res.redirect('/login');
  }else{
    next();
  }
 })
// function for serving html
 function servehtml (pagepath:string,filepath:string):void{
	app.get(pagepath,(req,res) => {res.sendFile(__dirname + '/public/' + filepath + '.html')});
 }

//Serving index page
 servehtml('/','index');
//serving login page
 app.get('/login',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if(!usersession){
    res.sendFile(__dirname + '/public/login.html')
  }else{
    res.redirect('/home')
  }
 })
//logout 
app.get('/logout',(req,res) => {
  res.clearCookie('session');
  res.redirect('/login')
})
//serving register page
 servehtml('/register','register');
//serving about us page
servehtml('/about_us','about_us')

//Users login
app.post('/login', (req,res) => {
		var username:string = req.body.username;
    var password:string = req.body.password;
    var userid: number ;
    var query:string = 'SELECT * FROM users WHERE username = $1'
    client.query(query,[username],(err:any,result:any) =>{
      if (result.rowCount == 0){
			  res.json({"result" : "Invalid username,Please try again"});
		  }else{
			  if(result.rows[0].password != password){
				  res.json({"result": "You have entered invalid password, Please try again with correct password."});
			  }else if(result.rows[0].password === password){
            userid = result.rows[0].u_id;
            const user_role = result.rows[0].u_role;
            const sessionID = v4();
            session[sessionID] = {u_name:username,u_id:userid,u_role:user_role} 
            res.cookie(`session`,sessionID,{
              maxAge: 10000 * 1000,
              secure: true,
              httpOnly: true,
              sameSite: 'lax'
            });
          res.redirect("/home")
        }
      }
	  })
})
//serving admin home page
app.get('/home',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  const u_id:number = usersession.u_id;
  if(usersession.u_role === 'admin'){
    const query:string = 'SELECT * FROM book_list'
    client.query(query,(err,result) => {
      res.render('a_booklist',{data: result.rows});
    })
  }else{
    const query:string = "SELECT b.*,l.ts FROM book_list b JOIN loaned l ON l.b_id = b.b_id WHERE u_id = $1"
    client.query(query,[u_id],(err,result) =>{
      res.render('u_return',{data:result.rows});
    })
  }
})
//resrve book
app.get('/home/reserve',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  const u_id:number = usersession.u_id;
	const query:string = "select * from book_list B where B.b_id not in (select b_id from loaned where u_id = $1)"
  client.query(query,[u_id],(err,result) =>{
    res.render('u_reserve',{data:result.rows})
  })
})

// users reserve
app.get('/home/reserve/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const query: string = 'SELECT * FROM book_list WHERE b_id = $1';
  client.query(query,[book_id],(err,result) => {
    var stocks:number = result.rows[0].book_stocks;
    const sessionID = req.cookies.session;
    const usersession = session[sessionID];
    if (stocks >= 1){
      stocks -= 1;
      const query1:string = "UPDATE book_list SET book_stocks = $1 WHERE b_id = $2"
      client.query(query1,[stocks,book_id],(err1,result1) =>{
        client.query('INSERT INTO loaned (u_id, b_id) SELECT $1,$2 WHERE NOT EXISTS (SELECT * FROM loaned WHERE u_id = $1 AND b_id = $2);',[usersession.u_id,book_id],(err2,result2)=>{
          res.redirect('/home');
        })
      })
    }else{
      res.json({message:"You have already reserved the book"})
    }
  }) 
})
//return a book
app.get('/home/return/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  const query = 'SELECT * FROM book_list WHERE b_id = $1';
  client.query(query,[book_id],(err,result) =>{
    const u_id:number = usersession.u_id
    let stocks:number = result.rows[0].book_stocks +1;
    const query1:string = 'UPDATE book_list SET book_stocks = $1 WHERE b_id = $2';
    client.query(query1,[stocks,book_id],(err1,result1) =>{
      client.query("DELETE FROM loaned WHERE u_id = $1 AND b_id = $2",[u_id,book_id],(err2,result2)=>{
        res.redirect('/home');
      })
    })
  })
})
//edit a book
app.get('/home/book_view/:id',(req,res) =>{
  const query:string = 'SELECT * FROM book_list WHERE b_id = $1'
  client.query(query,[req.params.id],(err,result)=>{

  })
})
//delete a book
app.get('/home/delete/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const query:string = 'DELETE FROM book_list WHERE b_id = $1'
  client.query(query,[book_id],(err,result) =>{
    res.redirect('/home')
  })
 })
//serving add a book
app.get('/home/add_book',(req,res) => {
  res.sendFile(__dirname + '/public/add_book.html');
})
//add a book
app.post('/home/add_book',(req,res) =>{
  const bname:string = req.body.book_name;
  const isbn:string = req.body.isbn_number;
  const author:string = req.body.author_name;
  const edition:number = req.body.book_edition;
  const publ:string = req.body.publication;
  const stocks:number = req.body.book_stocks;
  const query:string = 'SELECT * FROM book_list WHERE book_name = $1 OR isbn_number = $2'
  client.query(query,[bname,isbn],(err,result) => {
    if (result.rowCount === 0){
      const query1:string = "INSERT INTO book_list (book_name,isbn_number,author_name,book_edition,publication,book_stocks) VALUES ($1,$2,$3,$4,$5,$6)"
      client.query(query1,[bname,isbn,author,edition,publ,stocks],(err1,result1) => {
        res.redirect('/home')
      }) 
    }else{
      res.json({message:"The book or isbn code already exists."})
    }
  })
})
//audit log
app.get('/home/audit_log',(req,res)=>{
  client1.query("SELECT * FROM audit_log",(err,result)=>{
    res.render('a_audit_log',{data: result.rows});
  })
})

app.listen(3000)


