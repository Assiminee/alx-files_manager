// import mongodb from 'mongodb';

import MongoClient from "mongodb/lib/mongo_client";

class DBClient {
    constructor() {
        this.host = process.env.HOST || 'localhost';
        this.port = process.env.PORT || 27017;
        this.database = process.env.DATABASE_NAME || 'files_manager';

        // Call MongoClient.connect (not new MongoClient)
        MongoClient.connect(`mongodb://${this.host}:${this.port}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }, (err, client) => {
            if (err) {
                console.error(err.message);
            } else {
                this.client = client;
                this.db = this.client.db(this.database);
            }
        });
    }

    isAlive() {
        return !!this.db;
    }

    async nbUsers() {
        return this.db.collection('users').countDocuments();
    }

    async nbUsers() {
        return this.db.collection('files').countDocuments();
    }
}

export const dbClient = new DBClient();