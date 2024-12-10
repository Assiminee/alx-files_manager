// import mongodb from 'mongodb';

import MongoClient from "mongodb/lib/mongo_client";

class DBClient {
    constructor() {
        this.host = process.env.HOST || 'localhost';
        this.port = process.env.PORT || 27017;
        this.database = process.env.DATABASE_NAME || 'files_manager';

        this.init();
    }

    init() {
        return MongoClient.connect(`mongodb://${this.host}:${this.port}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then((client) => {
            this.client = client;
            this.db = client.db(this.database);
        }).catch((err) => {
            console.error(err.message);
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