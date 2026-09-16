const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Mock database to store repair items
const dataFile = path.join(__dirname, 'data.json');
let repairs = [];

if (fs.existsSync(dataFile)) {
    try {
        repairs = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    } catch (e) {
        console.error('Error reading data.json', e);
    }
}

const saveRepairs = () => {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(repairs, null, 2));
    } catch (e) {
        console.error('Error writing data.json (Vercel read-only FS):', e.message);
    }
};

// Middleware
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.use(express.json());

// Clean Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/repairs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'all-repairs.html'));
});

app.get('/ansaryadminnn', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Reviews storage
const reviewsFile = path.join(__dirname, 'reviews.json');
let reviews = [
    {
        id: "1",
        name: "أحمد محمود",
        comment: "خدمة ممتازة وسريعة وتعامل راقي جداً.. عربيتى رجعت زى التوكيل بالضبط بأسعار معقولة!",
        date: "2026-09-10"
    },
    {
        id: "2",
        name: "محمد السيد",
        comment: "مركز محترم والمهندسين شاطرين جداً.. تقسيط الصيانة بالفيزا مريح جداً.",
        date: "2026-09-12"
    }
];

if (fs.existsSync(reviewsFile)) {
    try {
        reviews = JSON.parse(fs.readFileSync(reviewsFile, 'utf8'));
    } catch (e) {
        console.error('Error reading reviews.json', e);
    }
} else {
    try {
        fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));
    } catch(e) {}
}

const saveReviews = () => {
    try {
        fs.writeFileSync(reviewsFile, JSON.stringify(reviews, null, 2));
    } catch (e) {
        console.error('Error writing reviews.json (Vercel read-only FS):', e.message);
    }
};

// API Endpoints
app.get('/api/repairs', (req, res) => {
    res.json(repairs);
});

app.post('/api/repairs', upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const newRepair = {
        id: Date.now().toString(),
        title: req.body.title ? req.body.title.trim() : '',
        description: req.body.description ? req.body.description.trim() : '',
        mediaPath: '/uploads/' + req.file.filename,
        mediaType: req.file.mimetype.startsWith('video') ? 'video' : 'image'
    };

    repairs.push(newRepair);
    saveRepairs();

    res.json({ message: 'Upload successful', repair: newRepair });
});

// Review Endpoints
app.get('/api/reviews', (req, res) => {
    res.json(reviews);
});

app.post('/api/reviews', (req, res) => {
    const { name, comment } = req.body;
    if (!name || !comment) {
        return res.status(400).json({ error: 'الاسم والرأي مطلوبان' });
    }

    const newReview = {
        id: Date.now().toString(),
        name: name.trim(),
        comment: comment.trim(),
        date: new Date().toISOString().split('T')[0]
    };

    reviews.unshift(newReview);
    saveReviews();

    res.json({ message: 'Review added', review: newReview });
});

app.delete('/api/reviews/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = reviews.length;
    reviews = reviews.filter(r => r.id !== id);
    
    if (reviews.length === initialLength) {
        return res.status(404).json({ error: 'Review not found' });
    }

    saveReviews();
    res.json({ message: 'Review deleted successfully' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;
