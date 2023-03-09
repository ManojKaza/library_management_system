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
//serving static files
app.use(express.static('public/styles'))

function servehtml (pagepath:string,filepath:string):void{
	app.get(pagepath,(req,res) => {res.sendFile(__dirname + '/public/' + filepath + '.html')});
}

//Serving index page
 servehtml('/','index');

//serving login page
app.get('/login',(req,res) => {
  const sessionID = req.cookies.session;
  if (session[sessionID]){
		if(session[sessionID].u_role == 'admin'){
      res.redirect('/admin_home');
    }else{
      res.redirect('/user_home');
    }
	}else{
    res.sendFile(__dirname + '/public/login.html',)
  }
})
//logout 
app.get('/logout',(req,res) => {
  res.clearCookie('session');
  res.redirect('/login')
})
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
		const query:string = 'SELECT * FROM book_list'
    client.query(query,(err,result) => {
    res.render('a_booklist',{data: result.rows});
    })
	}else{
		res.redirect('/login');
	}
})
//serving users home page
app.get('/user_home',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		const query:string = 'SELECT * FROM book_list'
    client.query(query,(err,result) => {
    res.render('u_booklist',{data: result.rows});
    })
	}else{
		res.redirect('/login');
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


//delete a book
app.get('/admin_home/delete/:id',(req,res) =>{
  const book_id:string = req.params.id;
  const query:string = 'DELETE FROM book_list WHERE b_id = $1'
  client.query(query,[book_id],(err,result) =>{
    res.redirect('/admin_home/a_booklist')
  })
 })
//serving add a book
app.get('/admin_home/add_book',(req,res) => {
  const sessionID = req.cookies.session;
  const usersession = session[sessionID];
  if (usersession){
		res.sendFile(__dirname + '/public/add_book.html')
	}else{
		res.redirect('/login');
	}
})
//add a book
app.post('/admin_home/add_book',(req,res) =>{
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
        res.redirect('/admin_home/a_booklist')
      }) 
    }else{
      res.json({message:"The book or isbn code already exists."})
    }
  })
})

app.listen(3000)


