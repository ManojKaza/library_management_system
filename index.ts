import express, { query } from 'express';
import bodyParser from 'body-parser';
import { Client } from 'pg';
import cookieParser from 'cookie-parser';
import { v4 } from 'uuid';
import { toASCII } from 'punycode';

const app = express();

const client = new Client({
  host: 'localhost',
  user: 'manoj',
  database: 'library',
  password: 'Admin',
  port: 5432,
})

client.connect();

app.set('view engine','ejs')

const session:{[uuid:string]:{u_name:string,u_id:number,u_role:string}} = {};

//body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
//cookie parser middleware
app.use(cookieParser());

function servehtml (pagepath:string,filepath:string):void{
	app.get(pagepath,(req,res) => {res.sendFile(__dirname + '/public/' + filepath + '.html')});
}

//Serving index page
 servehtml('/','index');

//serving login page
 servehtml('/login','login');

//serving register page
 servehtml('/register','register');

//Users login
app.post('/login', (req,res) => {
  var username:string = req.body.username;
  var password:string = req.body.password;
  var userid: number ;
  var query:string = 'SELECT * FROM users_login_details WHERE user_name = $1'
  client.query(query,[username],(err:any,result:any) =>{
    if (result.rowCount == 0){
			res.json({"result" : "Invalid username,Please try again"});
		}else{
			if(result.rows[0].password != password){
				res.json({"result": "You have entered invalid password, Please try again with correct password."});
			}else if(result.rows[0].password === password){
				  
            userid = result.rows[0].u_id;
            const user_role = result.rows[0].role;
            const sessionID = v4();
            session[sessionID] = {u_name:username,u_id:userid,u_role:user_role} 
            res.cookie(`session`,sessionID,{
              maxAge: 10000 * 1000,
              secure: true,
              httpOnly: true,
              sameSite: 'lax'
            });
            console.log("cookie set succesfully");
            console.log(session)
          if(result.rows[0].role === 'admin'){
            res.redirect('/admin_home')
          }else{
            res.redirect('/user_home')
          }
      }
    }
   })
  })
//serving admin home page
app.get('/admin_home',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		res.sendFile(__dirname + '/public/admin_home.html');
	}else{
		res.json({"result":"Invalid session or session expired"});
	}
})
//serving users home page
app.get('/user_home',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		res.sendFile(__dirname + '/public/user_home.html');
	}else{
		res.json({"result":"Invalid session or session expired"});
	}
})
//users book list functions
app.get('/user_home/u_booklist',(req,res) =>{
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		const query:string = 'SELECT * FROM book_list'
    client.query(query,(err,result) => {
    res.render('u_booklist',{data: result.rows});
    })
	}else{
		res.json({"result":"Invalid session or session expired"});
  }
})
//user reserve a book
app.get('/user_home/reserve/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const query: string = 'SELECT book_stocks FROM book_list WHERE b_id = $1';
  client.query(query,[book_id],(err,result) => {
    var stocks:number = result.rows[0].book_stocks; 
    if (stocks >= 1){
      stocks -= 1; 
      console.log(stocks);
      const query1:string = 'UPDATE book_list SET book_stocks = $1 WHERE b_id = $2';
      client.query(query1,[stocks,book_id],(error1,result1) => {
        
        res.json({message:"book reserved"});
      })
    }else{
      res.json({message:"Thebook is out of stock"})
    }
  })
})

//admin book list functions
app.get('/admin_home/a_booklist',(req,res) =>{
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		const query:string = 'SELECT * FROM book_list'
    client.query(query,(err,result) => {
    res.render('a_booklist',{data: result.rows});
    })
	}else{
		res.json({"result":"Invalid session or session expired"});
  }
})
//delete a book
app.get('/admin_home/delete/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const query:string = 'DELETE FROM book_list WHERE b_id = $1'
  client.query(query,[book_id],(err,result) =>{
    res.json({message:"The book is deleted"})
  })
 })
//serving add a book
app.get
//add a book

app.listen(3000)

