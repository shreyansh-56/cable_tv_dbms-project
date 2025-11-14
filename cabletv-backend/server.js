const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection (REPLACE WITH YOUR CREDENTIALS)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sid@170705', // CHANGE THIS
    database: 'CableTV_DBMS'
});

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL Connection Failed:', err);
        process.exit(1);
    }
    console.log('✅ MySQL Connected Successfully!');
});

// ============================================
// ========== 1. CORE CRUD ENDPOINTS ==========
// ============================================

// --- CUSTOMERS ---
app.get('/api/customers', (req, res) => {
    db.query('SELECT * FROM Customer ORDER BY Customer_ID', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        // NOTE: Age is automatically calculated by the trigger upon insert
        res.json(results);
    });
});
app.post('/api/customers', (req, res) => {
    const { Customer_ID, First_Name, Last_Name, Phone_No, City, Date_of_Birth } = req.body;
    db.query(
        'INSERT INTO Customer (Customer_ID, First_Name, Last_Name, Phone_No, City, Date_of_Birth) VALUES (?, ?, ?, ?, ?, ?)',
        [Customer_ID, First_Name, Last_Name, Phone_No, City, Date_of_Birth],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Customer added successfully!' });
        }
    );
});
app.delete('/api/customers/:id', (req, res) => {
    db.query('DELETE FROM Customer WHERE Customer_ID = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Customer deleted!' });
    });
});

// --- EMPLOYEES (Unchanged from your previous code) ---
app.get('/api/employees', (req, res) => {
    db.query('SELECT * FROM Employee ORDER BY Employee_Id', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/employees', (req, res) => {
    const { Employee_Id, Name, Contact } = req.body;
    db.query('INSERT INTO Employee (Employee_Id, Name, Contact) VALUES (?, ?, ?)',
        [Employee_Id, Name, Contact],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Employee added!' });
        }
    );
});
app.delete('/api/employees/:id', (req, res) => {
    db.query('DELETE FROM Employee WHERE Employee_Id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Employee deleted!' });
    });
});

// --- PACKAGES (Unchanged from your previous code) ---
app.get('/api/packages', (req, res) => {
    db.query('SELECT * FROM Package ORDER BY Cost', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/packages', (req, res) => {
    const { Package_Id, Name, Duration, Cost } = req.body;
    db.query(
        'INSERT INTO Package (Package_Id, Name, Duration, Cost) VALUES (?, ?, ?, ?)',
        [Package_Id, Name, Duration, Cost],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Package added!' });
        }
    );
});

// --- SUBSCRIPTIONS (Unchanged from your previous code) ---
app.get('/api/subscriptions', (req, res) => {
    // Uses the function GetSubscriptionStatus in the SQL
    const query = `
        SELECT *, GetSubscriptionStatus(Subscription_Id) AS Status 
        FROM Subscription 
        ORDER BY Start_Date DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/subscriptions', (req, res) => {
    const { Subscription_Id, Start_Date, End_Date, Customer_Id, Package_Id } = req.body;
    db.query(
        'INSERT INTO Subscription (Subscription_Id, Start_Date, End_Date, Customer_Id, Package_Id) VALUES (?, ?, ?, ?, ?)',
        [Subscription_Id, Start_Date, End_Date, Customer_Id, Package_Id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Subscription created!' });
        }
    );
});

// --- CHANNELS (Unchanged from your previous code) ---
app.get('/api/channels', (req, res) => {
    db.query('SELECT * FROM Channels ORDER BY Category, Name', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/channels', (req, res) => {
    const { Channel_Id, Name, Category } = req.body;
    db.query('INSERT INTO Channels (Channel_Id, Name, Category) VALUES (?, ?, ?)',
        [Channel_Id, Name, Category],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Channel added!' });
        }
    );
});
app.delete('/api/channels/:id', (req, res) => {
    db.query('DELETE FROM Channels WHERE Channel_Id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Channel deleted!' });
    });
});

// --- SHOWS ---
app.get('/api/shows', (req, res) => {
    db.query('SELECT * FROM Shows ORDER BY Name', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/shows', (req, res) => {
    const { Show_Id, Name, Genre, Channel_Id } = req.body;
    db.query(
        'INSERT INTO Shows (Show_Id, Name, Genre, Channel_Id) VALUES (?, ?, ?, ?)',
        [Show_Id, Name, Genre, Channel_Id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Show created!' });
        }
    );
});

// --- EPISODES (CRUD added. Note: The AFTER INSERT trigger runs here) ---
app.get('/api/episodes', (req, res) => {
    db.query('SELECT * FROM Episode ORDER BY Show_Id, Episode_No DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/episodes', (req, res) => {
    const { Episode_No, Show_Id, Title, Air_Date } = req.body;
    // This insert will trigger the 'after_episode_insert_update_show_episode_count' trigger
    db.query(
        'INSERT INTO Episode (Episode_No, Show_Id, Title, Air_Date) VALUES (?, ?, ?, ?)',
        [Episode_No, Show_Id, Title, Air_Date],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Episode added! Show episode count updated by trigger.' });
        }
    );
});

// --- BILLING (Unchanged from your previous code) ---
app.get('/api/billing', (req, res) => {
    db.query('SELECT * FROM Billing ORDER BY Date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/billing', (req, res) => {
    const { Billing_Id, Amount, Date, Discount, Customer_Id } = req.body;
    db.query(
        'INSERT INTO Billing (Billing_Id, Amount, Date, Discount, Customer_Id) VALUES (?, ?, ?, ?, ?)',
        [Billing_Id, Amount, Date, Discount, Customer_Id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Billing record created!' });
        }
    );
});

// --- INSTALLATIONS (Note: The BEFORE INSERT trigger runs here) ---
app.get('/api/installations', (req, res) => {
    db.query('SELECT * FROM Installation ORDER BY Date DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});
app.post('/api/installations', (req, res) => {
    const { Installation_Id, Date, Employee_Id, Customer_Id } = req.body;
    // This insert will trigger the 'before_installation_insert_validate_employee' trigger
    db.query(
        'INSERT INTO Installation (Installation_Id, Date, Employee_Id, Customer_Id) VALUES (?, ?, ?, ?)',
        [Installation_Id, Date, Employee_Id, Customer_Id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Installation scheduled! Employee validated by trigger.' });
        }
    );
});

// ============================================
// ========== 2. STORED PROCEDURES (POST) ==========
// ============================================

// 1. PROCEDURE: New Customer Signup (NewCustomerSubscription)
app.post('/api/procedures/new-customer-subscription', (req, res) => {
    const { customer_id, first_name, phone_no, city, date_of_birth, package_id, subscription_id } = req.body;
    db.query(
        'CALL NewCustomerSubscription(?, ?, ?, ?, ?, ?, ?)',
        [customer_id, first_name, phone_no, city, date_of_birth, package_id, subscription_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            // Procedures return result sets, typically we pick the first one
            res.json({ message: 'New customer and subscription created via stored procedure.', results: results[0] });
        }
    );
});

// 2. PROCEDURE: Record New Billing Payment (RecordNewPayment)
app.post('/api/procedures/record-payment', (req, res) => {
    const { billing_id, customer_id, amount, discount } = req.body;
    db.query(
        'CALL RecordNewPayment(?, ?, ?, ?)',
        [billing_id, customer_id, amount, discount],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Payment recorded via stored procedure.', results: results[0] });
        }
    );
});

// 3. PROCEDURE: Check Channel Availability by Category and City
app.post('/api/procedures/channels-by-city', (req, res) => {
    const { category, city } = req.body;
    db.query(
        'CALL GetChannelsByCategoryAndCity(?, ?)',
        [category, city],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            // Results array for procedures contains the actual data in the first element
            res.json({ results: results[0] });
        }
    );
});


// ============================================
// ========== 3. FUNCTIONS & VIEW (GET) ==========
// ============================================

// 1. FUNCTION: Check Subscription Status (Used above in subscriptions GET, also standalone)
app.get('/api/functions/subscription-status/:id', (req, res) => {
    db.query('SELECT GetSubscriptionStatus(?) AS status', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// 2. FUNCTION: Get Total Channel Count for a Package
app.get('/api/functions/package-channel-count/:id', (req, res) => {
    db.query('SELECT GetPackageChannelCount(?) AS count', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// 3. FUNCTION: Check if a Customer has an Active Installation
app.get('/api/functions/has-active-installation/:id', (req, res) => {
    db.query('SELECT HasActiveInstallation(?) AS installed', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// 4. VIEW: Package Summary (PackageSummary)
app.get('/api/views/package-summary', (req, res) => {
    db.query('SELECT * FROM PackageSummary', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));