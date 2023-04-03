import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { ImageModel, Image } from './models/Image';
import fs from 'fs'

// Inicjalizacja aplikacji
const app = express();
app.use(express.json());

// Połączenie z bazą danych
mongoose.connect('mongodb://localhost:27017/images');

const db = mongoose.connection;

db.on('error', (err) => {
    console.error('MongoDB error:', err);
});

db.once('open', () => {
    console.log('Połączono z mongoDB');
});

// Definicja interfejsu obiektu przekazywanego w zapytaniu POST
interface AddImageRequestBody {
    url: string;
}

// Endpoint do dodawania obrazka do kolejki
app.post('/images', async (req, res) => {
    try {
        // Pobranie URL obrazka z ciała zapytania
        const { url } = req.body as AddImageRequestBody;

        console.log(req.body)

        // Utworzenie nowego obiektu reprezentującego obrazek w bazie danych
        const image: Image = await ImageModel.create({ sourceUrl: url });

        // Zwrócenie adresu URL, pod którym można sprawdzić, czy obrazek został już pobrany
        res.status(200).json({ storedUrl: `/images/${image._id}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Wystąpił błąd' });
    }
});

// Endpoint do zwracania informacji o pobranym obrazku
app.get('/images/:id', async (req, res) => {
    try {
        // Pobranie obrazka z bazy danych
        const image = await ImageModel.findById(req.params.id);

        // Sprawdzenie, czy obrazek został już pobrany
        if (image?.storedUrl) {
            // Zwrócenie adresu URL, pod którym znajduje się pobrany obrazek
            res.status(200).json({
                storedUrl: image.storedUrl,
                createdAt: image.createdAt,
                finishedAt: image.finishedAt,
            });
        } else {
            // Zwrócenie informacji o statusie pobierania
            res.status(200).json({
                status: 'pending',
                createdAt: image?.createdAt,
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Wystąpił błąd' });
    }
});

// Endpoint do zwracania listy wszystkich obrazków
app.get('/images', async (req, res) => {
    try {
        // Pobranie wszystkich obrazków z bazy danych
        const images = await ImageModel.find();
        // Przekształcenie wyników zapytania na odpowiednią strukturę
        const formattedImages = images.map((image) => {
            if (image.storedUrl) {
                return {
                    id: image._id,
                    sourceUrl: image.sourceUrl,
                    storedUrl: image.storedUrl,
                    createdAt: image.createdAt,
                    finishedAt: image.finishedAt,
                };
            }

            return {
                id: image._id,
                sourceUrl: image.sourceUrl,
                status: 'pending',
                createdAt: image.createdAt,
            };

        });

        // Zwrócenie przekształconych obiektów w formie tablicy
        res.status(200).json(formattedImages);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Wystąpił błąd' });
    }
});

// Funkcja do pobierania obrazków
const downloadImage = async (image: Image): Promise<void> => {
    try {
        // Pobranie obrazka z adresu URL
        const response = await axios.get(image.sourceUrl, { responseType: 'stream' });

        // Generowanie nazwy pliku
        const filename = `${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

        // Zapisanie obrazka do folderu z pobranymi obrazkami
        const file = fs.createWriteStream(`downloads/${filename}`);
        response.data.pipe(file);

        // Aktualizacja informacji w bazie danych
        image.storedUrl = `http://localhost:3000/downloads/${filename}`;
        image.finishedAt = new Date();
        await image.save();

    } catch (error) {
        console.error(error);
    }
};

// Cykliczne pobieranie obrazków
setInterval(async () => {
    try {
        // Pobranie obrazków, które nie zostały jeszcze pobrane
        const images = await ImageModel.find({ storedUrl: { $exists: false } });


        // Pobranie każdego obrazka w osobnym procesie
        images.forEach((image) => {
            downloadImage(image);
        });

    } catch (error) {
        console.error(error);
    }
}, 5000);

// Port, na którym działa serwer
const PORT = 3000;

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
