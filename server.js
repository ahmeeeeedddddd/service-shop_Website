require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

// Supabase Setup
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nymfezqpvljlktakaodp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {
        console.error('Failed to init Supabase:', e.message);
    }
}

// Memory storage for Multer (Vercel & Supabase compatible)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Local database fallbacks
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
        console.error('Error writing data.json:', e.message);
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

// Local Reviews fallback storage
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
        console.error('Error writing reviews.json:', e.message);
    }
};

// API Endpoints: Repairs
app.get('/api/repairs', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('repairs').select('*');
            if (!error && data && data.length > 0) {
                return res.json(data);
            }
        } catch (e) {
            console.error('Supabase fetch repairs error:', e.message);
        }
    }
    res.json(repairs);
});

app.post('/api/repairs', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار ملف' });
    }

    const fileName = `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    let mediaPath = '';

    // Upload file to Supabase Storage
    if (supabase) {
        try {
            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('uploads')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: true
                });

            if (!uploadErr && uploadData) {
                const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(fileName);
                if (publicUrlData && publicUrlData.publicUrl) {
                    mediaPath = publicUrlData.publicUrl;
                }
            } else if (uploadErr) {
                console.error('Supabase upload error:', uploadErr.message);
            }
        } catch (e) {
            console.error('Supabase upload exception:', e.message);
        }
    }

    // Local file fallback
    if (!mediaPath) {
        try {
            const uploadDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
            mediaPath = '/uploads/' + fileName;
        } catch (e) {
            console.error('Local upload save error:', e.message);
            mediaPath = '/uploads/' + fileName;
        }
    }

    const newRepair = {
        id: Date.now().toString(),
        title: req.body.title ? req.body.title.trim() : '',
        description: req.body.description ? req.body.description.trim() : '',
        mediaPath: mediaPath,
        mediaType: req.file.mimetype.startsWith('video') ? 'video' : 'image'
    };

    if (supabase) {
        try {
            const { error: dbErr } = await supabase.from('repairs').insert([newRepair]);
            if (dbErr) console.error('Supabase repair db error:', dbErr.message);
        } catch (e) {
            console.error('Supabase repair insert error:', e.message);
        }
    }

    repairs.push(newRepair);
    saveRepairs();

    res.json({ message: 'Upload successful', repair: newRepair });
});

// API Endpoints: Reviews
app.get('/api/reviews', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('reviews').select('*');
            if (!error && data && data.length > 0) {
                return res.json(data);
            }
        } catch (e) {
            console.error('Supabase fetch reviews error:', e.message);
        }
    }
    res.json(reviews);
});

app.post('/api/reviews', async (req, res) => {
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

    if (supabase) {
        try {
            const { error: insErr } = await supabase.from('reviews').insert([newReview]);
            if (insErr) console.error('Supabase review insert error:', insErr.message);
        } catch (e) {
            console.error('Supabase review insert exception:', e.message);
        }
    }

    reviews.unshift(newReview);
    saveReviews();

    res.json({ message: 'Review added', review: newReview });
});

app.delete('/api/reviews/:id', async (req, res) => {
    const { id } = req.params;
    
    if (supabase) {
        try {
            await supabase.from('reviews').delete().eq('id', id);
        } catch (e) {
            console.error('Supabase delete review error:', e.message);
        }
    }

    const initialLength = reviews.length;
    reviews = reviews.filter(r => r.id !== id);
    saveReviews();
    res.json({ message: 'Review deleted successfully' });
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;
