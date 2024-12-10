import {MongoClient} from 'mongodb';

class DBClient {
    constructor() {
        this.host = process.env.DB_HOST || 'localhost';
        this.port = process.env.DB_PORT || 27017;
        this.database = process.env.DB_DATABASE || 'files_manager';

        this.init();
    }

    async init() {
        try {
            this.client = await MongoClient.connect(`mongodb://${this.host}:${this.port}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            this.db = this.client.db(this.database);
        } catch (err) {
            console.error(err.message);
        }
    }

    isAlive() {
        return !!this.db;
    }

    async nbUsers() {
        if (!this.db)
            throw new Error('Database not initialized');

        return await this.db.collection('users').countDocuments();
    }

    async nbFiles() {
        if (!this.db)
            throw new Error('Database not initialized');

        return await this.db.collection('files').countDocuments();
    }
}

const dbClient = new DBClient();
export default dbClient;
