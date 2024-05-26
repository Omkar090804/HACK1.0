import express from "express";
import multer from "multer";
import pkg from 'pg';
const { Pool } = pkg;
import bodyParser from "body-parser";
const app = express();
const port = 3000;
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; 
const saltRounds=5;
dotenv.config();


const upload = multer({ dest: 'uploads/' });
// Create PostgreSQL database connection
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ieee',
    password: String(process.env.POSTGRES_PASSWORD),
    port: 5432,
});
// Authentication middleware
const authenticate = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }

    res.status(401).json({ error: 'Unauthorized' });
};

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

// Invitation API
app.post('/api/invitation', async (req, res) => {
  const { name, email, phone, alternate_email, organization_name, role_in_organization, valid_till } = req.body;
 
  console.log("Received request body:", req.body);

  try {
    const client = await pool.connect();
    const result = await client.query(
      `INSERT INTO users (name, email, phone, alternate_email, organization_name, role_in_organization, valid_till) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, 
      [name, email, phone, alternate_email, organization_name, role_in_organization, valid_till]
    );
    
    const insertedUser = result.rows[0];
    console.log("Inserted user:", insertedUser);
    
    client.release();
    res.json(insertedUser);
  } catch (err) {
    console.error('Error executing query', err);
    res.status(500).json({ error: err.message });
  }
});


// Sign-up API
app.post('/api/signup', async (req, res) => {
    const { id, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds); // Hash the password
        const client = await pool.connect();
        await client.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, id]);
        client.release();
        res.json({ message: 'User signed up successfully' });
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: err.message });
    }
});
// Login API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT * FROM users WHERE email = $1`, [email]);
        client.release();
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }
        delete user.password;
        res.json(user);
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: err.message });
    }
});



app.post('/api/logout', (req, res) => {
  
  if (req.session) {
     
      req.session.destroy((err) => {
          if (err) {
              console.error('Error destroying session:', err);
              res.status(500).json({ error: 'Internal server error' });
          } else {
    
              res.json({ message: 'Logged out successfully' });
          }
      });
  } else {
      res.status(400).json({ error: 'No active session found' });
  }
});

// Edit user API

app.post('/api/edituser/:id', upload.single('profile_picture'),async (req, res) => {
    const id = req.params.id;
    const { name, email, phone, alternate_email, organization_name, role_in_organization, valid_till,profile_picture,password} = req.body;
    
    const updateFields = []; // Array to store fields to be updated
    const queryParams = []; // Array to store corresponding query parameters
    let paramIndex = 1; // Index for query parameters

    // Check each field and add it to the update query if it's provided
    if (name) {
        updateFields.push(`name = $${paramIndex}`);
        queryParams.push(name);
        paramIndex++;
    }
    if (email) {
        updateFields.push(`email = $${paramIndex}`);
        queryParams.push(email);
        paramIndex++;
    }
    if (phone) {
        updateFields.push(`phone = $${paramIndex}`);
        queryParams.push(phone);
        paramIndex++;
    }
    if (alternate_email) {
        updateFields.push(`alternate_email = $${paramIndex}`);
        queryParams.push(alternate_email);
        paramIndex++;
    }
    if (organization_name) {
        updateFields.push(`organization_name = $${paramIndex}`);
        queryParams.push(organization_name);
        paramIndex++;
    }
    if (role_in_organization) {
        updateFields.push(`role_in_organization = $${paramIndex}`);
        queryParams.push(role_in_organization);
        paramIndex++;
    }
    if (valid_till) {
        updateFields.push(`valid_till = $${paramIndex}`);
        queryParams.push(valid_till);
        paramIndex++;
    }
    if (profile_picture) {
        updateFields.push(`profile_picture = $${paramIndex}`);
        queryParams.push(profile_picture);
        paramIndex++;
    }
    if (password){
        updateFields.push(`password=$${paramIndex}`);
        queryParams.push(password);
        paramIndex++;
    }


    if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
    }

    const setClause = updateFields.join(', ');

    try {
        const client = await pool.connect();
        await client.query(
            `UPDATE users SET ${setClause} WHERE id = $${paramIndex}`, 
            [...queryParams, id]
        );
        client.release();
        res.json({ message: 'User details updated successfully' });
    } catch (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
