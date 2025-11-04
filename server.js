const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const DB_PATH = path.join(__dirname, 'db.json');

// --- Default Data ---
const defaultCategories = [
    {
        title: "Loops & Number Logic",
        icon: "repeat",
        problems: [
            { 
                id: "loops-1", 
                title: "1. Print Unique Numbers from User Input", 
                description: "Ask the user to enter 10 integers. Store them in an array. Then, iterate through the array and print only the numbers that are appearing for the *first* time.",
                example: "Example Input: 5, 10, 2, 10, 5, 3, 2, 9\nExample Output: 5, 10, 2, 3, 9"
            },
            { 
                id: "loops-2", 
                title: "2. Reverse a Number", 
                description: "Read an integer from the user and print its reverse.",
                example: "Example Input: 12345\nExample Output: 54321"
            }
        ]
    },
    {
        title: "Pattern Printing (Nested Loops)",
        icon: "palette",
        problems: [
            { 
                id: "patterns-1", 
                title: "1. Number Pyramid", 
                description: "Write a program to print a pyramid of numbers for a given height N.",
                example: "Example (N=4):\n   1\n  232\n 34543\n4567654"
            },
            { 
                id: "patterns-2", 
                title: "2. Floyd's Triangle", 
                description: "Write a program to print the first N rows of Floyd's Triangle.",
                example: "Example (N=4):\n1\n2  3\n4  5  6\n7  8  9  10"
            }
        ]
    },
    {
        title: "1D Arrays",
        icon: "folder",
        problems: [
            { 
                id: "arrays-1", 
                title: "1. Find Second Largest", 
                description: "Write a program that finds the second largest element in an array of integers. Try to do this in a single pass (i.e., with only one loop).",
                example: "Hint: Keep track of both the `largest` and `secondLargest` numbers as you iterate."
            },
            { 
                id: "arrays-2", 
                title: "2. Rotate Array", 
                description: "Write a function to rotate an array of N elements to the right by K steps. (Challenge: Can you do this *in-place*?)",
                example: "Example: arr = [1, 2, 3, 4, 5], K = 2\nResult: [4, 5, 1, 2, 3]"
            }
        ]
    },
    {
        title: "Strings (Arrays & Pointers)",
        icon: "file-text",
        problems: [
            { 
                id: "strings-1", 
                title: "1. Extract Vowels", 
                description: "Read a string from the user. Create a new string that contains only the vowels (a, e, i, o, u) from the original string, preserving their order.",
                example: "Example Input: This is a test string.\nExample Output: iiaei"
            },
            { 
                id: "strings-2", 
                title: "2. Reverse String (In-Place)", 
                description: "Write a function `void reverseString(char *str)`. This function takes a string (as a character pointer) and reverses it in-place (without creating a new array).",
                example: "Example: \"hello\" becomes \"olleh\""
            },
            { 
                id: "strings-3", 
                title: "3. Check for Palindrome", 
                description: "Write a function `int isPalindrome(char *str)` that returns 1 if the string is a palindrome, and 0 if it is not.",
                example: "Palindromes: \"racecar\", \"madam\", \"level\""
            },
            { 
                id: "strings-4", 
                title: "4. Find Most Frequent Character", 
                description: "Read a string and find the character that appears most frequently. If there's a tie, print the one that appeared first.",
                example: "Example Input: hello world\nExample Output: l (it appears 3 times)"
            }
        ]
    },
    {
        title: "2D Arrays (Matrices)",
        icon: "grid-3x3",
        problems: [
            { 
                id: "matrix-1", 
                title: "1. Boundary Sum", 
                description: "Write a program to read a 4x4 matrix from the user. Then, calculate and print the sum of all elements on the boundary of the matrix.",
                example: "This includes the first row, last row, first column, and last column."
            }
        ]
    },
    {
        title: "Functions & Recursion",
        icon: "gear",
        problems: [
            { 
                id: "functions-1", 
                title: "1. Prime Number Finder", 
                description: "Write a function `int isPrime(int num)`. This function should return 1 if `num` is a prime number and 0 otherwise. In `main()`, use this function to print all prime numbers between 1 and 100.",
                example: ""
            },
            { 
                id: "functions-2", 
                title: "2. Binary Search", 
                description: "Write a function that searches for a `target` number in a *sorted* array using the Binary Search algorithm.",
                example: "[Image of binary search algorithm diagram]\nLogic: Check the middle. If target is smaller, search the left half. If larger, search the right half. Repeat."
            },
            { 
                id: "functions-3", 
                title: "3. Count Occurrences (Recursion)", 
                description: "Write a recursive function `int countOccurrences(char *str, char target)`. This function should return the total number of times the `target` character appears in the `str`.",
                example: "Example Call: countOccurrences(\"mississippi\", 's')\nShould return: 4"
            },
            { 
                id: "functions-4", 
                title: "4. Fibonacci Sequence (Recursion vs. Loops)", 
                description: "Write a function to get the N-th number in the Fibonacci sequence (0, 1, 1, 2, 3, 5, 8...).\nTask 1: Write it using a loop (iteratively).\nTask 2: Write it using recursion.",
                example: ""
            }
        ]
    },
    {
        title: "Structures",
        icon: "person",
        problems: [
            { 
                id: "structs-1", 
                title: "1. Filter Books by Price", 
                description: "Define a `struct Book` containing `book_id` (int), `title` (char array), and `price` (float). Create an array of 5 `struct Book` variables, get the details, and print the `title` of all books that cost more than 500.0.",
                example: ""
            },
            { 
                id: "structs-2", 
                title: "2. Sort Student Records", 
                description: "Define a `struct Student` with `char name[50]` and `int marks`. Create an array of 5 `Student` objects. Get their details, then sort the entire array in descending order based on `marks` and print the sorted list.",
                example: ""
            }
        ]
    },
    {
        title: "File Handling",
        icon: "folder",
        problems: [
            { 
                id: "files-1", 
                title: "1. Copy Lines by Condition", 
                description: "Read from `File1.txt`. Create a new file, `File2.txt`, and copy only the lines from `File1.txt` that start with an uppercase letter.",
                example: "Hint: You'll need to keep track of whether you are at the beginning of a new line."
            }
        ]
    }
];

// --- Middleware ---
app.use(express.json());
app.use(express.static(__dirname));

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// --- Helper Functions ---
function readDb() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            const db = JSON.parse(data);
            // Ensure all required fields exist
            if (!db.completed) db.completed = {};
            if (!db.customCategories) db.customCategories = [];
            if (!db.codeSolutions) db.codeSolutions = {};
            return db;
        }
    } catch (err) {
        console.error("Error reading database:", err);
    }
    // Return default structure if file doesn't exist or has errors
    return { completed: {}, customCategories: [], codeSolutions: {} };
}

function writeDb(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Error writing to database:", err);
        return false;
    }
}

// Initialize database file if it doesn't exist
function initializeDb() {
    if (!fs.existsSync(DB_PATH)) {
        const initialData = {
            completed: {},
            customCategories: [],
            codeSolutions: {}
        };
        writeDb(initialData);
        console.log('Initialized new database file');
    }
}

// --- API Endpoints ---

// 1. Get all data (problems, progress, and code solutions)
app.get('/api/data', (req, res) => {
    const db = readDb();
    res.json({
        defaultCategories: defaultCategories,
        customCategories: db.customCategories,
        completed: db.completed,
        codeSolutions: db.codeSolutions
    });
});

// 2. Add a new custom problem
app.post('/api/problems', (req, res) => {
    const { categoryTitle, title, description, example } = req.body;
    
    if (!categoryTitle || !title || !description) {
        return res.status(400).json({ error: 'Missing required fields: categoryTitle, title, description' });
    }
    
    const db = readDb();
    
    const newProblem = {
        id: `custom-${Date.now()}`,
        title: title,
        description: description,
        example: example || ''
    };
    
    let existingCustomCategory = db.customCategories.find(c => c.title === categoryTitle);
    
    if (existingCustomCategory) {
        existingCustomCategory.problems.push(newProblem);
    } else {
        let existingDefault = defaultCategories.find(c => c.title === categoryTitle);
        const icon = existingDefault ? existingDefault.icon : 'default';
        
        db.customCategories.push({
            title: categoryTitle,
            icon: icon,
            problems: [newProblem]
        });
    }
    
    if (writeDb(db)) {
        res.status(201).json({ message: 'Problem added successfully', problem: newProblem });
    } else {
        res.status(500).json({ error: 'Failed to save problem' });
    }
});

// 3. Update completion status
app.put('/api/complete', (req, res) => {
    const { problemId, isChecked } = req.body;
    
    if (typeof problemId === 'undefined' || typeof isChecked === 'undefined') {
        return res.status(400).json({ error: 'Missing problemId or isChecked' });
    }

    const db = readDb();
    db.completed[problemId] = isChecked;
    
    if (writeDb(db)) {
        res.status(200).json({ message: 'Progress updated successfully' });
    } else {
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// 4. Save code solution
app.post('/api/code', (req, res) => {
    const { problemId, code } = req.body;
    
    if (typeof problemId === 'undefined' || typeof code === 'undefined') {
        return res.status(400).json({ error: 'Missing problemId or code' });
    }

    const db = readDb();
    db.codeSolutions[problemId] = code;
    
    if (writeDb(db)) {
        res.status(200).json({ message: 'Code saved successfully' });
    } else {
        res.status(500).json({ error: 'Failed to save code' });
    }
});

// 5. Get code solution for a specific problem
app.get('/api/code/:problemId', (req, res) => {
    const { problemId } = req.params;
    
    const db = readDb();
    const code = db.codeSolutions[problemId] || '';
    
    res.json({ problemId, code });
});

// 6. Get all custom categories (for debugging)
app.get('/api/custom-categories', (req, res) => {
    const db = readDb();
    res.json(db.customCategories);
});

// 7. Get all completed problems (for debugging)
app.get('/api/completed', (req, res) => {
    const db = readDb();
    res.json(db.completed);
});

// 8. Update entire custom categories (for future use)
app.put('/api/custom-categories', (req, res) => {
    const { customCategories } = req.body;
    
    if (!Array.isArray(customCategories)) {
        return res.status(400).json({ error: 'customCategories must be an array' });
    }

    const db = readDb();
    db.customCategories = customCategories;
    
    if (writeDb(db)) {
        res.status(200).json({ message: 'Custom categories updated successfully' });
    } else {
        res.status(500).json({ error: 'Failed to update custom categories' });
    }
});

// --- Serve the HTML file ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Health check endpoint ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- Error handling middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// --- 404 handler ---
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// --- Initialize database and start the server ---
initializeDb();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`Database file: ${DB_PATH}`);
});