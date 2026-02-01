const mongoose = require('mongoose');

async function connectDatabase() {

    try {
        const mongoUri = process.env.MONGO_URI;
        console.log(`Connecting to MongoDB... :${mongoUri}`);

        await mongoose.connect(mongoUri,{
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        })

        console.log("MongoDB connected successfully");

        mongoose.connection.on('error', (err) => {
            console.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        });
        
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error}`);
        process.exit(1);
        
    }
    
}