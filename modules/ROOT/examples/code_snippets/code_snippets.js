import {
    Database,
    Replicator,
    DocID,
    LogCategory,
    type DatabaseConfig,
    type ReplicatorConfig,
    type CBLDictionary,
    type CBLDocument
} from '@couchbase/lite-js';
import * as logtape from '@logtape/logtape';



// tag::database-schema[]
// Define document types for collections
interface Task {
    type: 'task';
    title: string;
    completed: boolean;
    createdAt: string;
}

interface User {
    type: 'user';
    username: string;
    email: string;
    role: string;
}

// Define database schema
interface AppSchema {
    tasks: Task;
    users: User;
}
// end::database-schema[]

// tag::open-database[]
// Open database with configuration
const config: DatabaseConfig<AppSchema> = {
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {},
        users: {}
    }
};

const database = await Database.open(config);
console.log('Database opened:', database.name);
// end::open-database[]

// tag::open-database-with-indexes[]
// Open database with collections and indexes
const configWithIndexes: DatabaseConfig<AppSchema> = {
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {
            indexes: ['title', 'completed', 'createdAt']
        },
        users: {
            indexes: ['username', 'email']
        }
    }
};

const db = await Database.open(configWithIndexes);
// end::open-database-with-indexes[]

// tag::open-database-encrypted[]
// Open database with encryption
const encryptedConfig: DatabaseConfig = {
    name: 'secure-app',
    version: 1,
    password: 'my-secure-password',
    collections: {
        users: {
            unencryptedProperties: ['username', 'email']
        }
    }
};

const secureDb = await Database.open(encryptedConfig);
// end::open-database-encrypted[]

// tag::close-database[]
// Close the database
await database.close();
console.log('Database closed');
// end::close-database[]

// tag::reopen-database[]
// Reopen a closed database
await database.reopen();
console.log('Database reopened');
// end::reopen-database[]

// tag::reopen-encrypted-database[]
// Reopen encrypted database with password
await secureDb.reopen({
    password: 'my-secure-password'
});
// end::reopen-encrypted-database[]

// tag::delete-database[]
// Close and delete database
await database.close();
await Database.deleteDatabase('myapp');
console.log('Database deleted');
// end::delete-database[]

// tag::database-exists[]
// Check if database exists
const exists = await Database.exists('myapp');
if (exists) {
    console.log('Database exists');
} else {
    console.log('Database does not exist');
}
// end::database-exists[]

// tag::change-encryption-key[]
// Change encryption key
await secureDb.changeEncryptionKey('new-password');
console.log('Encryption key changed');
// end::change-encryption-key[]

// tag::remove-encryption[]
// Remove encryption
await secureDb.changeEncryptionKey(undefined);
console.log('Encryption removed');
// end::remove-encryption[]

// tag::database-maintenance[]
// Compact database to reclaim space
await database.performMaintenance('compact');
console.log('Database compacted');
// end::database-maintenance[]

// tag::check-storage-quota[]
// Check storage quota
if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    console.log('Quota:', estimate.quota);
    console.log('Usage:', estimate.usage);
    console.log('Available:', estimate.quota - estimate.usage);
}
// end::check-storage-quota[]

// tag::request-persistent-storage[]
// Request persistent storage
if (navigator.storage && navigator.storage.persist) {
    const isPersistent = await navigator.storage.persist();
    if (isPersistent) {
        console.log('Persistent storage granted');
    }
}
// end::request-persistent-storage[]


// tag::access-collection[]
// Access a collection
const tasks = database.collections.tasks;
const users = database.collections.users;
// end::access-collection[]

// tag::access-custom-scope-collection[]
// Access collection in custom scope
const inventoryAirlines = database.collections['inventory.airline'];
// end::access-custom-scope-collection[]

// tag::get-collection-count[]
// Get document count in collection
const count = await tasks.count();
console.log('Document count:', count);
// end::get-collection-count[]

// tag::list-collections[]
// List all collection names
const collectionNames = database.collectionNames;
for (const name of collectionNames) {
    console.log('Collection:', name);
}
// end::list-collections[]

// tag::declare-custom-scope[]
// Declare collections with custom scopes
const travelConfig: DatabaseConfig = {
    name: 'travel',
    version: 1,
    collections: {
        'inventory.airline': {
            indexes: ['name', 'icao']
        },
        'inventory.hotel': {
            indexes: ['country', 'city']
        }
    }
};

const travelDb = await Database.open(travelConfig);
// end::declare-custom-scope[]

// tag::add-collection[]
// Add a new collection (requires close and reopen)
await database.close();

const updatedConfig: DatabaseConfig<AppSchema> = {
    name: 'myapp',
    version: 2, // Increment version
    collections: {
        tasks: {},
        users: {},
        projects: {} // New collection
    }
};

const updatedDb = await Database.open(updatedConfig);
// end::add-collection[]

// tag::create-document[]
// Create a document with auto-generated ID
const task = {
    type: 'task',
    title: 'Learn Couchbase Lite',
    completed: false,
    createdAt: new Date().toISOString()
};

const savedDoc = await tasks.save(task);
console.log('Document created with ID:', savedDoc._id);
// end::create-document[]

// tag::create-document-with-id[]
// Create a document with specific ID
const docId = DocID('task-001');
const taskWithId = tasks.createDocument(docId, {
    type: 'task',
    title: 'Specific ID task',
    completed: false,
    createdAt: new Date().toISOString()
});

await tasks.save(taskWithId);
// end::create-document-with-id[]

// tag::get-document[]
// Retrieve a document by ID
const doc = await tasks.getDocument(savedDoc._id);
if (doc) {
    console.log('Task:', doc.title);
} else {
    console.log('Document not found');
}
// end::get-document[]

// tag::update-document[]
// Update a document
const docToUpdate = await tasks.getDocument(savedDoc._id);
if (docToUpdate) {
    docToUpdate.completed = true;
    docToUpdate.completedAt = new Date().toISOString();
    await tasks.save(docToUpdate);
    console.log('Document updated');
}
// end::update-document[]

// tag::delete-document[]
// Delete a document
await tasks.deleteDocument(savedDoc._id);
console.log('Document deleted');
// end::delete-document[]

// tag::save-multiple-documents[]
// Save multiple documents in a transaction
const newTasks = [
    tasks.createDocument(DocID('task-002'), {
        type: 'task',
        title: 'Task 2',
        completed: false,
        createdAt: new Date().toISOString()
    }),
    tasks.createDocument(DocID('task-003'), {
        type: 'task',
        title: 'Task 3',
        completed: false,
        createdAt: new Date().toISOString()
    })
];

await tasks.updateMultiple({ save: newTasks });
console.log('Multiple documents saved');
// end::save-multiple-documents[]

// tag::purge-document[]
// Permanently purge a document
await tasks.purge(savedDoc._id);
console.log('Document purged');
// end::purge-document[]

// tag::create-query[]
// Create a query
const query = database.createQuery(`
    SELECT *
    FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
`);
// end::create-query[]

// tag::execute-query[]
// Execute query and iterate results
const results = await query.execute();

for (const row of results) {
    const task = row.tasks;
    console.log(`Task: ${task.title}`);
}

console.log(`Found ${results.length} tasks`);
// end::execute-query[]

// tag::query-with-callback[]
// Execute query with row callback
await query.execute(row => {
    const task = row.tasks;
    console.log(`Task: ${task.title}`);
});
// end::query-with-callback[]

// tag::parameterized-query[]
// Create parameterized query
const paramQuery = database.createQuery(`
    SELECT *
    FROM tasks
    WHERE completed = $completed
    ORDER BY createdAt DESC
`);

// Execute with parameters
const completedResults = await paramQuery.execute({ completed: true });
// end::parameterized-query[]

// tag::query-explanation[]
// Get query explanation
const explanation = query.explanation;
console.log('Query plan:', explanation);
// end::query-explanation[]

// tag::create-live-query[]
// Create a live query
const liveQuery = database.createQuery(`
    SELECT *
    FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
`);

// Add change listener
liveQuery.addChangeListener(results => {
    console.log('Query results updated:', results.length);

    // Update UI
    updateTaskList(results);
});

// Start the live query
liveQuery.start();
// end::create-live-query[]

// tag::stop-live-query[]
// Stop a live query
liveQuery.stop();
// end::stop-live-query[]



// tag::create-indexes-in-config[]
// Create indexes in database configuration
const configWithIndex: DatabaseConfig = {
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {
            indexes: ['title', 'completed', 'createdAt']
        }
    }
};

const dbWithIndexes = await Database.open(configWithIndex);
// end::create-indexes-in-config[]

// tag::create-composite-index[]
// Create composite index
const compositeConfig: DatabaseConfig = {
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {
            indexes: [
                ['completed', 'createdAt'], // Composite index
                'title' // Single property index
            ]
        }
    }
};
// end::create-composite-index[]

// tag::create-replicator[]
// Create a replicator
const replicatorConfig: ReplicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} },
        users: { pull: {}, push: {} }
    },
    continuous: true
};

const replicator = new Replicator(replicatorConfig);
// end::create-replicator[]

// tag::replicator-authentication[]
// Configure replicator with authentication
const authReplicatorConfig: ReplicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} }
    },
    credentials: {
        username: 'user@example.com',
        password: 'password'
    },
    continuous: true
};

const authReplicator = new Replicator(authReplicatorConfig);
// end::replicator-authentication[]

// tag::start-replication[]
// Start replication
await replicator.start();
console.log('Replication started');
// end::start-replication[]

// tag::stop-replication[]
// Stop replication
await replicator.stop();
console.log('Replication stopped');
// end::stop-replication[]

// tag::replication-status[]
// Monitor replication status
replicator.onStatusChange = (status) => {
    console.log('Status:', status.status);

    if (status.pulledRevisions !== undefined) {
        console.log('Pulled:', status.pulledRevisions);
    }

    if (status.pushedRevisions !== undefined) {
        console.log('Pushed:', status.pushedRevisions);
    }

    if (status.error) {
        console.error('Replication error:', status.error);
    }
};
// end::replication-status[]

// tag::one-shot-replication[]
// One-shot replication
const oneShotConfig: ReplicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} }
    },
    continuous: false
};

const oneShotReplicator = new Replicator(oneShotConfig);
await oneShotReplicator.run();
console.log('One-shot replication complete');
// end::one-shot-replication[]

// tag::collection-change-listener[]
// Listen for collection changes
const token = tasks.addChangeListener(changes => {
    console.log(`${changes.documentIDs.length} documents changed`);

    for (const docId of changes.documentIDs) {
        console.log('Changed document:', docId);
    }
});

// Remove listener when done
tasks.removeChangeListener(token);
// end::collection-change-listener[]

// tag::document-change-listener[]
// Listen for specific document changes
const docToken = tasks.addDocumentChangeListener(savedDoc._id, change => {
    console.log('Document changed:', change.documentID);
});

// Remove listener
tasks.removeDocumentChangeListener(docToken);
// end::document-change-listener[]

// tag::configure-logging[]
// Configure logging
await logtape.configure({
    sinks: {
        console: logtape.getConsoleSink(),
    },
    loggers: [
        {
            category: LogCategory,
            lowestLevel: 'info',
            sinks: ['console'],
        }
    ],
});
// end::configure-logging[]

// tag::configure-logging-verbose[]
// Configure verbose logging for database operations
await logtape.configure({
    sinks: {
        console: logtape.getConsoleSink(),
    },
    loggers: [
        {
            category: [LogCategory, 'DB'],
            lowestLevel: 'debug',
            sinks: ['console'],
        }
    ],
});
// end::configure-logging-verbose[]

// tag::configure-logging-query[]
// Configure logging for queries
await logtape.configure({
    sinks: {
        console: logtape.getConsoleSink(),
    },
    loggers: [
        {
            category: [LogCategory, 'Query'],
            lowestLevel: 'debug',
            sinks: ['console'],
        }
    ],
});
// end::configure-logging-query[]

function updateTaskList(results: any[]) {
    // Update UI with query results
    const taskList = document.getElementById('task-list');
    if (taskList) {
        taskList.innerHTML = '';
        for (const row of results) {
            const task = row.tasks;
            const li = document.createElement('li');
            li.textContent = task.title;
            taskList.appendChild(li);
        }
    }
}