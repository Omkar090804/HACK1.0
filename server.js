import express from "express";
import path from "path";
import pg from "pg";
import axios from "axios";
import { randomInt } from "crypto";
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
const saltRounds = 10; 
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'views')));
// Set up PostgreSQL client
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "pbl",
    password: "Arnav@112",
    port: "5432",
});
db.connect();

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.render("login.ejs");
});
app.get('/loginfinal',(req,res)=>{
    res.sendFile(path.join(__dirname, "index.html"));
});
app.post('/loginfinal', async (req, res) => {
const username=req.body.username;
const password=req.body.password;
const aadhar=req.body.aadhar;
const email=req.body.email;
const phone=req.body.phone;
console.log(username);
console.log(password);
    
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert user into the database
        await db.query('INSERT INTO users (username, password_hash,aadhar_number,email,phone_number) VALUES ($1, $2,$3,$4,$5)', [username, hashedPassword,aadhar,email,phone]);
    } catch (error) {
        console.error('Error signing up:', error);
        res.status(500).send('Error signing up');
    }
});
app.get('/login', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error serving index.html');
        } else {
            console.log('index.html sent successfully');
        }
    });
});
app.get('/feedback', async (req, res) => {
    try {
        // Fetch feedback data from the database
        const query = 'SELECT * FROM feedback ';
        const result = await db.query(query);
        const feedbackData = result.rows;
        
        // Render the 'feedback.ejs' template and pass the feedback data
        res.render('feedback', { feedbackData });
    } catch (error) {
        console.error('Error fetching feedback data:', error);
        res.status(500).send('Error fetching feedback data');
    }
});

app.get('/expensecopy.html',(req,res)=>{
res.sendFile(path.join(__dirname, "expensecopy.html"));
});

app.post('/portfolio', async (req, res) => {
    try {
        const { username, password, aadhar, email, phone } = req.body; // Assuming you're using session-based authentication
        
        // Update user information in the database
        await db.query('UPDATE users SET username = $1,aadhar_number = $2, email = $3, phone_number = $4 WHERE id =(select max(id) from users)',
            [username, aadhar, email, phone]);
        
        res.redirect('/portfolio');
    } catch (error) {
        console.error('Error updating user information:', error);
        res.status(500).send('Error updating user information');
    }
});
app.post('/author', (req, res) => {
    const name = req.body.username;
    const password = req.body.password;

    if (name === "temple45" && password === "temple123") {
        res.sendFile('author.html', { root: __dirname }); // Assuming author.html is in the same directory as this script
    } else {
        res.status(401).send('Unauthorized: username and password do not match.');
    }
});
app.get("/logins",(req,res)=>{
    res.sendFile(path.join(__dirname, "/views/adminlogin.html"));
});
app.post('/author',(req,res)=>{
res.sendFile(path.join(__dirname, "author.html"));
})

// Handle user login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Query the database to get the hashed password for the provided username
        const result = await db.query('SELECT * FROM users WHERE id = (SELECT MAX(id) FROM users);',);
        const user = result.rows[0];
        
        if (!user) {
            return res.status(401).send('User not found');
        }
        
        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.status(401).send('Incorrect password');
        }
        
        // User authentication successful
        res.send('Login successful!');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Error logging in');
    }
});

// Handle donation submission
app.post('/donate', async (req, res) => {
    const { userId, templeAddress, donationAmount } = req.body;
    
    try {
        // Insert donation details into the database
        await db.query('INSERT INTO donations (user_id, temple_address, amount) VALUES ($1, $2, $3)', [userId, templeAddress, donationAmount]);
        
        res.send('');
    } catch (error) {
        console.error('Error submitting donation:', error);
        res.status(500).send('Error submitting donation');
    }
});
app.get('/feedback', (req, res) => {
    const sql = 'SELECT * FROM feedback ORDER BY timestamp DESC';
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to database: ' + err.message);
        res.status(500).send('Internal server error');
        return;
      }
      
      // Execute the query
      connection.query(sql, (err, results) => {
        connection.release(); // Release the connection back to the pool
        
        if (err) {
          console.error('Error executing query: ' + err.message);
          res.status(500).send('Internal server error');
          return;
        }
        
        // Send feedback data as JSON response
        res.json(results);
      });
    });
  });

app.get("/transactions/address", async (req, res) => {
    const address = req.params.address;
    const apiKey = "ZYBG3U52UJCXHPE752BG435HMQHN84EDKR"; // Your Etherscan API key
    const etherscanAPI = `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=${apiKey}`;

    try {
        // Fetch transaction details from Etherscan API using Axios
        const response = await axios.get(etherscanAPI);
        const data = response.data;

        // Extract relevant transaction details (amount, timestamp)
        const transactions = data.result.map(tx => ({
            amount: tx.value,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000) // Convert Unix timestamp to JavaScript Date object
        }));

        res.json(transactions);
    } catch (error) {
        console.error("Error fetching transactions from Etherscan:", error);
        res.status(500).send("Error fetching transactions");
    }
});
app.get("/about.html",async(req,res)=>{
    res.render("about.ejs")
});
app.get("/loginfinal",async(req,res)=>{
    res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/temples", async (req, res) => {
    res.sendFile(path.join(__dirname, "temples.html"));
});

app.get("/index.html", async (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/author.html", async (req, res) => {
    res.sendFile(path.join(__dirname, "author.html"));
});

app.get("/admin.html", async (req, res) => {
    res.sendFile(path.join(__dirname, "admin.html"));
});

// Handle POST request to submit transaction
app.post("/submit", async (req, res) => {
    const address = req.body.recipientAddress;
    let addressfinal="";
    if (address === "temple1"){
         addressfinal="0x2FDf8A7da97e35fCA9B2D5CB43690d8a29b1459b"
    }
    else{
         addressfinal="0x3D0a7b23B0b245203CfB39af68e62E6A915DcAaF"
    }
    const amount = req.body.amount;
    const txhash = Math.floor(Math.random() * 1000);
    // Send transaction using MetaMask
    // Insert transaction details into the database
    db.query(
        "INSERT INTO transactions (tx_hash, recipient_address, amount) VALUES ($1, $2, $3) RETURNING *",
        [txhash, addressfinal, amount],
        (err, result) => {
            if (err) {
                console.error("Error inserting transaction:", err);
                res.status(500).send("Error submitting transaction");
            } else {
                console.log("Transaction inserted:", result.rows[0]);
                res.send("Transaction submitted successfully");
            }
        }
    );
    res.download(path.resolve("./reciept.txt"));
});

// Handle GET request to submit transaction and store in database
app.get("/submit", (req, res) => {
    const txHash = 12;
    const recipientAddress = req.query.recipientAddress;
    const amount = req.query.amount;

    // Insert transaction details into the database
    const insertQuery = `
        INSERT INTO transactions (tx_hash, recipient_address, amount)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [txHash, recipientAddress, amount];

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error("Error inserting transaction:", err);
            res.status(500).send("Error submitting transaction");
        } else {
            console.log("Transaction inserted:", result.rows[0]);
            res.send("Transaction submitted successfully");
        }
    });
    res.download(path.resolve("./reciept.txt"));
});

app.get('/admin', async (req, res) => {
    try {
        // Query the database for transaction data
        const { rows } = await db.query('SELECT recipient_address, amount, timestamp FROM transactions');

        // Calculate total amount received
        const result = await db.query('select sum(amount) from transactions');
        const totalAmount = result.rows[0].sum;

        // Render the EJS template with data
        res.render('admin', { totalAmount, transactions: rows });
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get("/expenses.html", async (req, res) => {
    res.sendFile(__dirname, "expenses.html");
});
app.post("/feedback", (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const message = req.body.message;

    // Insert feedback details into the database
    const insertQuery = `
        INSERT INTO feedback (name, email, message)
        VALUES ($1, $2, $3)
        RETURNING *;
    `;
    const values = [name, email, message];

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error("Error inserting feedback:", err);
            res.status(500).send("Error submitting feedback");
        } else {
            console.log("Feedback inserted:", result.rows[0]);
            var popup = window.open("", "FeedbackPopup", "width=400,height=200");
    if (popup) {
        // If the popup is successfully opened, write content to it
        popup.document.write("<h2>Thank you for your feedback!</h2>");
        popup.document.write("<p>We appreciate your valuable input.</p>");
        popup.focus();
    } else {
        // If the popup fails to open, fallback to an alert
        alert("Thank you for giving your valuable feedback");
    }
        }
    });
});
app.get("/feedback",(req,res)=>{
res.redirect('./index.html');
});
// H;andle POST request to submit transaction and store in database
app.listen(5000, () => {
    console.log("Server listening on port 5000");
});
