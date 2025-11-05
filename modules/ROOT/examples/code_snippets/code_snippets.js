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



// Define document types for collections
// tag::database-schema[]
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

// Open database with configuration
// tag::open-database[]
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

// Open database with collections and indexes
// tag::open-database-with-indexes[]
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

// Open database with encryption
// tag::open-database-encrypted[]
const encryptedConfig: DatabaseConfig = {
    name: 'secure-app', //<.>
    version: 1,
    password: 'my-secure-password', //<.>
    collections: {
        users: {
            unencryptedProperties: ['username', 'email'] //<.>
        }
    }
};

const secureDb = await Database.open(encryptedConfig);
// end::open-database-encrypted[]

// Close the database
// tag::close-database[]
await database.close();
console.log('Database closed');
// end::close-database[]

// Reopen a closed database
// tag::reopen-database[]
await database.reopen();
console.log('Database reopened');
// end::reopen-database[]

// Reopen encrypted database with password
// tag::reopen-encrypted-database[]
await secureDb.reopen({
    password: 'my-secure-password'
});
// end::reopen-encrypted-database[]

// Close and delete database
// tag::delete-database[]
await database.close();
await Database.deleteDatabase('myapp');
console.log('Database deleted');
// end::delete-database[]

// Check if database exists
// tag::database-exists[]
const exists = await Database.exists('myapp');
if (exists) {
    console.log('Database exists');
} else {
    console.log('Database does not exist');
}
// end::database-exists[]

// Change encryption key
// tag::change-encryption-key[]
await secureDb.changeEncryptionKey('new-password');
console.log('Encryption key changed');
// end::change-encryption-key[]

// Remove encryption
// tag::remove-encryption[]
await secureDb.changeEncryptionKey(undefined);
console.log('Encryption removed');
// end::remove-encryption[]

// Compact database to reclaim space
// tag::database-maintenance[]
await database.performMaintenance('compact');
console.log('Database compacted');
// end::database-maintenance[]

// Check storage quota
// tag::check-storage-quota[]
if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    console.log('Quota:', estimate.quota);
    console.log('Usage:', estimate.usage);
    console.log('Available:', estimate.quota - estimate.usage);
}
// end::check-storage-quota[]

// Request persistent storage
// tag::request-persistent-storage[]
if (navigator.storage && navigator.storage.persist) {
    const isPersistent = await navigator.storage.persist();
    if (isPersistent) {
        console.log('Persistent storage granted');
    }
}
// end::request-persistent-storage[]


// Access a collection
// tag::access-collection[]
const tasks = database.collections.tasks;
const users = database.collections.users;
// end::access-collection[]

// Access collection in custom scope
// tag::access-custom-scope-collection[]
const inventoryAirlines = database.collections['inventory.airline'];
// end::access-custom-scope-collection[]

// Get document count in collection
// tag::get-collection-count[]
const count = await tasks.count();
console.log('Document count:', count);
// end::get-collection-count[]

// List all collection names
// tag::list-collections[]
const collectionNames = database.collectionNames;
for (const name of collectionNames) {
    console.log('Collection:', name);
}
// end::list-collections[]

// Declare collections with custom scopes
// tag::declare-custom-scope[]
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

// Add a new collection (requires close and reopen)
// tag::add-collection[]
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

// Create a document with auto-generated ID
// tag::create-document[]
const task = {
    type: 'task',
    title: 'Learn Couchbase Lite',
    completed: false,
    createdAt: new Date().toISOString()
};

const savedDoc = await tasks.save(task);
console.log('Document created with ID:', savedDoc._id);
// end::create-document[]

// Create a document with specific ID
// tag::create-document-with-id[]
const docId = DocID('task-001');
const taskWithId = tasks.createDocument(docId, {
    type: 'task',
    title: 'Specific ID task',
    completed: false,
    createdAt: new Date().toISOString()
});

await tasks.save(taskWithId);
// end::create-document-with-id[]

// Retrieve a document by ID
// tag::get-document[]
const doc = await tasks.getDocument(savedDoc._id);
if (doc) {
    console.log('Task:', doc.title);
} else {
    console.log('Document not found');
}
// end::get-document[]

// Update a document
// tag::update-document[]
const docToUpdate = await tasks.getDocument(savedDoc._id);
if (docToUpdate) {
    docToUpdate.completed = true;
    docToUpdate.completedAt = new Date().toISOString();
    await tasks.save(docToUpdate);
    console.log('Document updated');
}
// end::update-document[]

// Delete a document
// tag::delete-document[]
await tasks.deleteDocument(savedDoc._id);
console.log('Document deleted');
// end::delete-document[]

// Save multiple documents in a transaction
// tag::save-multiple-documents[]
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

// Permanently purge a document
// tag::purge-document[]
await tasks.purge(savedDoc._id);
console.log('Document purged');
// end::purge-document[]

// Create a query
// tag::create-query[]
const query = database.createQuery(`
    SELECT *
    FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
`);
// end::create-query[]

// Execute query and iterate results
// tag::execute-query[]
const results = await query.execute();

for (const row of results) {
    const task = row.tasks;
    console.log(`Task: ${task.title}`);
}

console.log(`Found ${results.length} tasks`);
// end::execute-query[]

// Execute query with row callback
// tag::query-with-callback[]
await query.execute(row => {
    const task = row.tasks;
    console.log(`Task: ${task.title}`);
});
// end::query-with-callback[]

// Create parameterized query
// tag::parameterized-query[]
const paramQuery = database.createQuery(`
    SELECT *
    FROM tasks
    WHERE completed = $completed
    ORDER BY createdAt DESC
`);

// Execute with parameters
const completedResults = await paramQuery.execute({ completed: true });
// end::parameterized-query[]

// Get query explanation
// tag::query-explanation[]
const explanation = query.explanation;
console.log('Query plan:', explanation);
// end::query-explanation[]

// Create a live query
// tag::create-live-query[]
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

// Stop a live query
// tag::stop-live-query[]
liveQuery.stop();
// end::stop-live-query[]



// Create indexes in database configuration
// tag::create-indexes-in-config[]
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

// Create composite index
// tag::create-composite-index[]
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

// Create a replicator
// tag::create-replicator[]
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

// Configure replicator with authentication
// tag::replicator-authentication[]
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

// Start replication
// tag::start-replication[]
await replicator.start();
console.log('Replication started');
// end::start-replication[]

// Stop replication
// tag::stop-replication[]
await replicator.stop();
console.log('Replication stopped');
// end::stop-replication[]

// Monitor replication status
// tag::replication-status[]
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

// One-shot replication
// tag::one-shot-replication[]
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

// Listen for collection changes
// tag::collection-change-listener[]
const token = tasks.addChangeListener(changes => {
    console.log(`${changes.documentIDs.length} documents changed`);

    for (const docId of changes.documentIDs) {
        console.log('Changed document:', docId);
    }
});

// Remove listener when done
tasks.removeChangeListener(token);
// end::collection-change-listener[]

// Listen for specific document changes
// tag::document-change-listener[]
const docToken = tasks.addDocumentChangeListener(savedDoc._id, change => {
    console.log('Document changed:', change.documentID);
});

// Remove listener
tasks.removeDocumentChangeListener(docToken);
// end::document-change-listener[]

// Configure logging
// tag::configure-logging[]
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

// Configure verbose logging for database operations
// tag::configure-logging-verbose[]
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

// Configure logging for queries
// tag::configure-logging-query[]
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

// Declare indexes when opening database
// tag::basic-index[]
const config: DatabaseConfig = {
    name: 'myapp',
    version: 1,
    collections: {
        products: {
            indexes: ['name', 'price', 'category']
        }
    }
};

const db = await Database.open(config);
// end::basic-index[]

// Index individual properties
// tag::property-index[]
const productConfig: DatabaseConfig = {
    name: 'store',
    version: 1,
    collections: {
        products: {
            indexes: [
                'sku',        // Product SKU
                'price',      // Product price
                'inStock'     // Stock status
            ]
        }
    }
};
// end::property-index[]

// Index array properties
// tag::array-index[]
const articleConfig: DatabaseConfig = {
    name: 'blog',
    version: 1,
    collections: {
        articles: {
            indexes: [
                'tags',       // Array of tags
                'categories'  // Array of categories
            ]
        }
    }
};
// end::array-index[]

// Index nested object properties using dot notation
// tag::nested-index[]
const userConfig: DatabaseConfig = {
    name: 'app',
    version: 1,
    collections: {
        users: {
            indexes: [
                'profile.name',
                'profile.email',
                'address.city',
                'address.country'
            ]
        }
    }
};
// end::nested-index[]

// Create multiple indexes for complex queries
// tag::multiple-indexes[]
const orderConfig: DatabaseConfig = {
    name: 'orders',
    version: 1,
    collections: {
        orders: {
            indexes: [
                'customerId',     // Filter by customer
                'status',         // Filter by status
                'orderDate',      // Sort by date
                'totalAmount'     // Sort/filter by amount
            ]
        }
    }
};
// end::multiple-indexes[]

// Define schema with TypeScript
// tag::typescript-indexes[]
interface Product {
    sku: string;
    name: string;
    price: number;
    category: string;
    tags: string[];
}

interface StoreSchema {
    products: Product;
}

// Configure with type-safe indexes
const storeConfig: DatabaseConfig<StoreSchema> = {
    name: 'store',
    version: 1,
    collections: {
        products: {
            indexes: ['sku', 'price', 'category', 'tags']
        }
    }
};

const storeDb = await Database.open(storeConfig);
// end::typescript-indexes[]

// Close database
// tag::modify-indexes[]
await database.close();

// Reopen with new indexes
const updatedConfig: DatabaseConfig = {
    name: 'myapp',
    version: 2,  // Increment version
    collections: {
        products: {
            indexes: [
                'name',
                'price',
                'category',
                'manufacturer'  // New index added
            ]
        }
    }
};

const updatedDb = await Database.open(updatedConfig);
// end::modify-indexes[]

// Create query
// tag::verify-index[]
const query = database.createQuery(`
    SELECT * FROM products
    WHERE price > 100
    ORDER BY price
`);

// Check query explanation
const explanation = query.explanation;
console.log(explanation);

// Look for "Search index" in explanation to confirm index usage
if (explanation.includes('Search index')) {
    console.log('Query uses index');
} else {
    console.log('Query scans collection');
}
// end::verify-index[]

// Store dates as ISO strings or timestamps
// tag::date-index[]
interface Event {
    title: string;
    startDate: string;      // ISO date string: "2024-01-15T10:00:00Z"
    timestamp: number;      // Unix timestamp: 1705315200000
}

const eventConfig: DatabaseConfig = {
    name: 'events',
    version: 1,
    collections: {
        events: {
            indexes: [
                'startDate',    // Index ISO date string
                'timestamp'     // Index numeric timestamp
            ]
        }
    }
};
// end::date-index[]

// High selectivity: many unique values
// tag::high-selectivity[]
const emailConfig: DatabaseConfig = {
    name: 'users',
    version: 1,
    collections: {
        users: {
            indexes: [
                'email',      // Unique per user - excellent selectivity
                'userId',     // Unique - excellent selectivity
                'ssn'         // Unique - excellent selectivity
            ]
        }
    }
};
// end::high-selectivity[]

// Low selectivity: few unique values
// tag::low-selectivity[]
const taskConfig: DatabaseConfig = {
    name: 'tasks',
    version: 1,
    collections: {
        tasks: {
            // Not recommended: boolean has only 2 possible values
            indexes: ['completed']  // Low selectivity
        }
    }
};

// Better: combine with high-selectivity queries
const query = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false
    AND assignedTo = $userId  -- High selectivity filter
`);
// end::low-selectivity[]

// Check IndexedDB storage usage
// tag::storage-usage[]
if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();

    const quotaGB = (estimate.quota / (1024 ** 3)).toFixed(2);
    const usageGB = (estimate.usage / (1024 ** 3)).toFixed(2);
    const percentUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

    console.log(`Storage: ${usageGB} GB / ${quotaGB} GB (${percentUsed}%)`);
}
// end::storage-usage[]

// Query that uses indexes efficiently
// tag::indexed-query[]
const indexedQuery = database.createQuery(`
    SELECT *
    FROM products
    WHERE category = 'electronics'  -- Uses category index
    ORDER BY price                  -- Uses price index
    LIMIT 50
`);

const results = await indexedQuery.execute();
// end::indexed-query[]

// Query without index - scans entire collection
// tag::unindexed-query[]
const unindexedQuery = database.createQuery(`
    SELECT *
    FROM products
    WHERE description LIKE '%wireless%'  -- No index on description
`);

// This will be slow on large datasets
const slowResults = await unindexedQuery.execute();
// end::unindexed-query[]

// Use LIMIT for pagination and performance
// tag::limit-query[]
const limitedQuery = database.createQuery(`
    SELECT *
    FROM products
    WHERE category = $category
    ORDER BY price DESC
    LIMIT 20 OFFSET $offset
`);

// Fetch first page
const page1 = await limitedQuery.execute({
    category: 'electronics',
    offset: 0
});

// Fetch next page
const page2 = await limitedQuery.execute({
    category: 'electronics',
    offset: 20
});
// end::limit-query[]

// Email/username lookup pattern
// tag::email-pattern[]
const authConfig: DatabaseConfig = {
    name: 'auth',
    version: 1,
    collections: {
        users: {
            indexes: ['email', 'username']
        }
    }
};

// Fast lookup by email
const userQuery = database.createQuery(`
    SELECT * FROM users
    WHERE email = $email
`);

const user = await userQuery.execute({ email: 'user@example.com' });
// end::email-pattern[]

// Status filtering pattern
// tag::status-pattern[]
const workflowConfig: DatabaseConfig = {
    name: 'workflow',
    version: 1,
    collections: {
        tasks: {
            indexes: ['status', 'priority', 'assignedTo']
        }
    }
};

// Query by status
const activeTasksQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE status IN ('pending', 'in-progress')
    AND assignedTo = $userId
    ORDER BY priority DESC
`);
// end::status-pattern[]

// Date range query pattern
// tag::date-range-pattern[]
const analyticsConfig: DatabaseConfig = {
    name: 'analytics',
    version: 1,
    collections: {
        events: {
            indexes: ['timestamp', 'eventType']
        }
    }
};

// Query date range
const dateRangeQuery = database.createQuery(`
    SELECT * FROM events
    WHERE timestamp >= $startDate
    AND timestamp <= $endDate
    ORDER BY timestamp DESC
`);

const recentEvents = await dateRangeQuery.execute({
    startDate: Date.now() - (7 * 24 * 60 * 60 * 1000),  // 7 days ago
    endDate: Date.now()
});
// end::date-range-pattern[]

// Category filtering pattern
// tag::category-pattern[]
const catalogConfig: DatabaseConfig = {
    name: 'catalog',
    version: 1,
    collections: {
        products: {
            indexes: ['category', 'subcategory', 'brand']
        }
    }
};

// Hierarchical category query
const categoryQuery = database.createQuery(`
    SELECT * FROM products
    WHERE category = $category
    AND subcategory = $subcategory
    ORDER BY name
`);

const laptops = await categoryQuery.execute({
    category: 'electronics',
    subcategory: 'laptops'
});
// end::category-pattern[]

// tag::performance-test[]
// Performance testing pattern
async function testQueryPerformance() {
    // Test without index
    const startUnindexed = performance.now();
    const unindexedResults = await database.createQuery(`
        SELECT * FROM products WHERE description LIKE '%test%'
    `).execute();
    const timeUnindexed = performance.now() - startUnindexed;

    console.log(`Unindexed query: ${timeUnindexed.toFixed(2)}ms`);
    console.log(`Results: ${unindexedResults.length}`);

    // Test with index
    const startIndexed = performance.now();
    const indexedResults = await database.createQuery(`
        SELECT * FROM products WHERE category = 'electronics'
    `).execute();
    const timeIndexed = performance.now() - startIndexed;

    console.log(`Indexed query: ${timeIndexed.toFixed(2)}ms`);
    console.log(`Results: ${indexedResults.length}`);
    console.log(`Speedup: ${(timeUnindexed / timeIndexed).toFixed(1)}x`);
}

await testQueryPerformance();
// end::performance-test[]

// tag::index-migration[]
// Migration strategy for adding indexes
async function migrateIndexes() {
    // Step 1: Check current version
    const currentDb = await Database.open({
        name: 'myapp',
        version: 1,
        collections: {
            products: {
                indexes: ['name']
            }
        }
    });

    console.log('Current version:', currentDb.version);

    // Step 2: Close database
    await currentDb.close();

    // Step 3: Reopen with new indexes and incremented version
    const migratedDb = await Database.open({
        name: 'myapp',
        version: 2,
        collections: {
            products: {
                indexes: [
                    'name',
                    'price',      // New index
                    'category'    // New index
                ]
            }
        }
    });

    console.log('Migrated to version:', migratedDb.version);

    return migratedDb;
}

await migrateIndexes();
// end::index-migration[]

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


// Add these to your code_snippets.js file:

// tag::basic-query[]
const query = database.createQuery('SELECT * FROM tasks');
const results = await query.execute();
// end::basic-query[]

// tag::select-all[]
const allQuery = database.createQuery('SELECT * FROM tasks');
const allResults = await allQuery.execute();
// end::select-all[]

// tag::select-props[]
const propsQuery = database.createQuery(`
    SELECT title, completed, createdAt
    FROM tasks
`);
const propResults = await propsQuery.execute();
// end::select-props[]

// tag::where-clause[]
// Simple WHERE clause
const whereQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false
`);

// Multiple conditions
const multiWhereQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false
    AND type = 'urgent'
`);
// end::where-clause[]

// tag::logical-operators[]
// Using AND
const andQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false AND priority = 'high'
`);

// Using OR
const orQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE priority = 'high' OR priority = 'critical'
`);

// Using NOT
const notQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE NOT completed
`);
// end::logical-operators[]

// tag::pattern-matching[]
// LIKE with wildcards
const likeQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE title LIKE 'Learn%'
`);

// Contains pattern
const containsQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE title LIKE '%Couchbase%'
`);

// Single character wildcard
const singleQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE title LIKE 'Task_'
`);
// end::pattern-matching[]

// tag::regex-matching[]
// Regular expression matching
const regexQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE REGEXP_LIKE(title, '^[A-Z].*')
`);

// Check if contains pattern
const regexContainsQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE REGEXP_CONTAINS(description, 'important|urgent')
`);
// end::regex-matching[]

// tag::order-by[]
// Order ascending
const ascQuery = database.createQuery(`
    SELECT * FROM tasks
    ORDER BY createdAt ASC
`);

// Order descending
const descQuery = database.createQuery(`
    SELECT * FROM tasks
    ORDER BY createdAt DESC
`);

// Multiple order columns
const multiOrderQuery = database.createQuery(`
    SELECT * FROM tasks
    ORDER BY priority DESC, createdAt ASC
`);
// end::order-by[]

// tag::limit-offset[]
// Limit results
const limitQuery = database.createQuery(`
    SELECT * FROM tasks
    LIMIT 10
`);

// Pagination with LIMIT and OFFSET
const pageQuery = database.createQuery(`
    SELECT * FROM tasks
    ORDER BY createdAt DESC
    LIMIT 20 OFFSET 40
`);
// end::limit-offset[]

// tag::join[]
// LEFT OUTER JOIN
const joinQuery = database.createQuery(`
    SELECT tasks.title, users.username
    FROM tasks
    LEFT OUTER JOIN users ON tasks.assignedTo = users._id
    WHERE tasks.completed = false
`);

const joinResults = await joinQuery.execute();
// end::join[]

// tag::group-by[]
// GROUP BY with aggregate function
const groupQuery = database.createQuery(`
    SELECT status, COUNT(*) AS count
    FROM tasks
    GROUP BY status
`);

// GROUP BY with HAVING clause
const havingQuery = database.createQuery(`
    SELECT assignedTo, COUNT(*) AS taskCount
    FROM tasks
    GROUP BY assignedTo
    HAVING COUNT(*) > 5
`);
// end::group-by[]

// tag::array-functions[]
// Array functions
const arrayQuery = database.createQuery(`
    SELECT
        title,
        ARRAY_LENGTH(tags) AS tagCount,
        ARRAY_CONTAINS(tags, 'urgent') AS isUrgent
    FROM tasks
    WHERE ARRAY_LENGTH(tags) > 0
`);

// Array aggregation
const arrayAggQuery = database.createQuery(`
    SELECT
        category,
        ARRAY_AGG(title) AS titles
    FROM tasks
    GROUP BY category
`);
// end::array-functions[]

// tag::string-functions[]
// String manipulation
const stringQuery = database.createQuery(`
    SELECT
        UPPER(title) AS upperTitle,
        LOWER(title) AS lowerTitle,
        LENGTH(title) AS titleLength,
        TRIM(title) AS trimmedTitle
    FROM tasks
`);

// String concatenation
const concatQuery = database.createQuery(`
    SELECT
        title || ' - ' || status AS fullTitle
    FROM tasks
`);
// end::string-functions[]

// tag::date-functions[]
// Date functions
const dateQuery = database.createQuery(`
    SELECT
        title,
        STR_TO_MILLIS(createdAt) AS timestamp,
        MILLIS_TO_STR(STR_TO_MILLIS(createdAt)) AS formattedDate
    FROM tasks
`);

// Date arithmetic
const dateRangeQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE STR_TO_MILLIS(createdAt) > STR_TO_MILLIS($startDate)
    AND STR_TO_MILLIS(createdAt) < STR_TO_MILLIS($endDate)
`);
// end::date-functions[]

// tag::math-functions[]
// Mathematical functions
const mathQuery = database.createQuery(`
    SELECT
        title,
        ROUND(progress * 100) AS percentage,
        ABS(budget - spent) AS difference,
        CEIL(duration / 24) AS days,
        FLOOR(duration / 24) AS wholeDays
    FROM tasks
`);

// Using POWER and SQRT
const advMathQuery = database.createQuery(`
    SELECT
        title,
        POWER(priority, 2) AS prioritySquared,
        SQRT(estimatedHours) AS sqrtHours
    FROM tasks
`);
// end::math-functions[]

// tag::type-functions[]
// Type checking
const typeCheckQuery = database.createQuery(`
    SELECT
        title,
        TYPE(metadata) AS metadataType,
        ISSTRING(title) AS isTitleString,
        ISNUMBER(priority) AS isPriorityNumber,
        ISARRAY(tags) AS isTagsArray
    FROM tasks
`);

// Type conversion
const typeConvertQuery = database.createQuery(`
    SELECT
        TOSTRING(priority) AS priorityString,
        TONUMBER(estimatedHours) AS hours,
        TOBOOLEAN(completed) AS isDone
    FROM tasks
`);
// end::type-functions[]

// tag::conditional-functions[]
// Handling NULL and MISSING
const conditionalQuery = database.createQuery(`
    SELECT
        title,
        IFNULL(assignedTo, 'unassigned') AS assigned,
        IFMISSING(dueDate, 'no due date') AS due,
        IFMISSINGORNULL(completedAt, 'not completed') AS completion
    FROM tasks
`);

// NULLIF and MISSINGIF
const nullifQuery = database.createQuery(`
    SELECT
        title,
        NULLIF(status, 'unknown') AS validStatus,
        MISSINGIF(progress, 0) AS nonZeroProgress
    FROM tasks
`);
// end::conditional-functions[]

// tag::case-expression[]
// Simple CASE expression
const caseQuery = database.createQuery(`
    SELECT
        title,
        CASE priority
            WHEN 1 THEN 'Low'
            WHEN 2 THEN 'Medium'
            WHEN 3 THEN 'High'
            ELSE 'Unknown'
        END AS priorityLabel
    FROM tasks
`);

// Searched CASE expression
const searchedCaseQuery = database.createQuery(`
    SELECT
        title,
        CASE
            WHEN completed THEN 'Done'
            WHEN dueDate < $now THEN 'Overdue'
            WHEN dueDate < $soon THEN 'Due Soon'
            ELSE 'On Track'
        END AS taskStatus
    FROM tasks
`);
// end::case-expression[]

// tag::metadata[]
// Access document metadata
const metaQuery = database.createQuery(`
    SELECT
        META().id AS docId,
        META().sequence AS seq,
        title,
        completed
    FROM tasks
`);

// Filter by document ID
const idQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE META().id = $docId
`);
// end::metadata[]

// tag::execute-query-array[]
// Execute and return array of all results
const query = database.createQuery('SELECT * FROM tasks WHERE completed = false');
const results = await query.execute();

console.log(`Found ${results.length} incomplete tasks`);

for (const row of results) {
    console.log(`Task: ${row.tasks.title}`);
}
// end::execute-query-array[]

// tag::execute-query-callback[]
// Execute with callback for memory efficiency
const query = database.createQuery('SELECT * FROM tasks WHERE completed = false');

let count = 0;
await query.execute(row => {
    console.log(`Task ${++count}: ${row.tasks.title}`);
    // Process each row without storing all in memory
});

console.log(`Processed ${count} tasks total`);
// end::execute-query-callback[]

// tag::query-column-names[]
// Get column names from query
const query = database.createQuery(`
    SELECT title, completed, createdAt
    FROM tasks
`);

const columnNames = query.columnNames;
console.log('Columns:', columnNames);  // ['title', 'completed', 'createdAt']
// end::query-column-names[]

// tag::select-star-results[]
// SELECT * structure
const starQuery = database.createQuery('SELECT * FROM tasks');
const starResults = await starQuery.execute();

for (const row of starResults) {
    // Results nested under collection name
    const task = row.tasks;  // Access via collection name
    console.log(task.title, task.completed);
}
// end::select-star-results[]

// tag::select-props-results[]
// SELECT properties structure
const propsQuery = database.createQuery(`
    SELECT title, completed
    FROM tasks
`);
const propsResults = await propsQuery.execute();

for (const row of propsResults) {
    // Properties at top level
    console.log(row.title, row.completed);
}
// end::select-props-results[]

// tag::access-values[]
// Accessing result values
const query = database.createQuery('SELECT title, completed, priority FROM tasks');
const results = await query.execute();

for (const row of results) {
    const title = row.title;
    const completed = row.completed;
    const priority = row.priority;

    console.log(`${title}: ${completed ? 'Done' : 'Pending'} (Priority: ${priority})`);
}
// end::access-values[]

// tag::result-aliases[]
// Using aliases
const aliasQuery = database.createQuery(`
    SELECT
        title AS taskName,
        completed AS isDone,
        createdAt AS created
    FROM tasks
`);

const results = await aliasQuery.execute();

for (const row of results) {
    console.log(`${row.taskName} - Done: ${row.isDone}`);
}
// end::result-aliases[]

// tag::nested-properties[]
// Accessing nested properties
const nestedQuery = database.createQuery(`
    SELECT
        title,
        assignee.name,
        assignee.email,
        metadata.tags
    FROM tasks
`);

const results = await nestedQuery.execute();

for (const row of results) {
    console.log(`Task: ${row.title}`);
    console.log(`Assigned to: ${row.name} (${row.email})`);
    console.log(`Tags: ${row.tags.join(', ')}`);
}
// end::nested-properties[]

// tag::collect-all-results[]
// Collect all results as array
const query = database.createQuery('SELECT * FROM tasks');
const allResults = await query.execute();

// Now you have an array of all results
console.log(`Total tasks: ${allResults.length}`);

// Can use array methods
const completedTasks = allResults.filter(row => row.tasks.completed);
console.log(`Completed: ${completedTasks.length}`);
// end::collect-all-results[]

// tag::callback-results[]
// Process with callback for memory efficiency
const query = database.createQuery('SELECT * FROM tasks');

const completed = [];
await query.execute(row => {
    if (row.tasks.completed) {
        completed.push(row.tasks);
    }
    // Row is processed and can be garbage collected
});

console.log(`Found ${completed.length} completed tasks`);
// end::callback-results[]

// tag::count-results[]
// Count results efficiently
const query = database.createQuery('SELECT COUNT(*) AS count FROM tasks WHERE completed = false');
const results = await query.execute();

const count = results[0].count;
console.log(`Incomplete tasks: ${count}`);
// end::count-results[]

// tag::aggregate-results[]
// Aggregate functions
const aggQuery = database.createQuery(`
    SELECT
        COUNT(*) AS total,
        SUM(estimatedHours) AS totalHours,
        AVG(priority) AS avgPriority,
        MIN(createdAt) AS earliest,
        MAX(createdAt) AS latest
    FROM tasks
`);

const results = await aggQuery.execute();
const stats = results[0];

console.log(`Total: ${stats.total}`);
console.log(`Total Hours: ${stats.totalHours}`);
console.log(`Avg Priority: ${stats.avgPriority}`);
// end::aggregate-results[]

// tag::group-by-results[]
// GROUP BY results
const groupQuery = database.createQuery(`
    SELECT
        status,
        COUNT(*) AS count,
        AVG(priority) AS avgPriority
    FROM tasks
    GROUP BY status
`);

const results = await groupQuery.execute();

for (const row of results) {
    console.log(`${row.status}: ${row.count} tasks (Avg Priority: ${row.avgPriority})`);
}
// end::group-by-results[]

// tag::join-results[]
// JOIN results
const joinQuery = database.createQuery(`
    SELECT
        tasks.title,
        tasks.status,
        users.username,
        users.email
    FROM tasks
    LEFT OUTER JOIN users ON tasks.assignedTo = users._id
`);

const results = await joinQuery.execute();

for (const row of results) {
    console.log(`Task: ${row.title}`);
    if (row.username) {
        console.log(`Assigned to: ${row.username} (${row.email})`);
    } else {
        console.log('Unassigned');
    }
}
// end::join-results[]

// tag::null-missing[]
// Handling NULL and MISSING
const query = database.createQuery(`
    SELECT
        title,
        assignedTo,
        dueDate,
        IFNULL(assignedTo, 'unassigned') AS assigned,
        IFMISSING(dueDate, 'no due date') AS due
    FROM tasks
`);

const results = await query.execute();

for (const row of results) {
    // NULL values appear as null
    if (row.assignedTo === null) {
        console.log('Task not assigned');
    }

    // MISSING values don't exist in the object
    if (!('dueDate' in row)) {
        console.log('No due date set');
    }
}
// end::null-missing[]

// tag::results-to-json[]
// Convert results to JSON
const query = database.createQuery('SELECT * FROM tasks LIMIT 10');
const results = await query.execute();

// Convert to JSON string
const jsonString = JSON.stringify(results, null, 2);
console.log(jsonString);

// Or save to file/localStorage
localStorage.setItem('taskResults', jsonString);
// end::results-to-json[]

// tag::typescript-query-results[]
// Type-safe query results with TypeScript
interface TaskResult {
    title: string;
    completed: boolean;
    priority: number;
    createdAt: string;
}

const query = database.createQuery<TaskResult>(`
    SELECT title, completed, priority, createdAt
    FROM tasks
    WHERE completed = false
`);

const results = await query.execute();

// TypeScript knows the result type
for (const row of results) {
    const title: string = row.title;  // Type-safe access
    const priority: number = row.priority;
}
// end::typescript-query-results[]

// tag::query-result-type[]
// Specify result type on execute
interface TaskSummary {
    taskName: string;
    isDone: boolean;
}

const query = database.createQuery(`
    SELECT
        title AS taskName,
        completed AS isDone
    FROM tasks
`);

const results = await query.execute<TaskSummary>();

// Results are typed as TaskSummary[]
results.forEach(task => {
    console.log(`${task.taskName}: ${task.isDone ? 'Done' : 'Pending'}`);
});
// end::query-result-type[]

// tag::streaming-results[]
// Process results as stream without storing all
const query = database.createQuery('SELECT * FROM tasks');

let processedCount = 0;
await query.execute(row => {
    // Process each row immediately
    processRow(row.tasks);
    processedCount++;

    // Row is not stored, can be garbage collected
});

console.log(`Streamed ${processedCount} results`);
// end::streaming-results[]

// tag::filter-results[]
// Filter results in callback
const query = database.createQuery('SELECT * FROM tasks');

const urgentTasks = [];
await query.execute(row => {
    const task = row.tasks;

    // Only keep urgent tasks
    if (task.priority === 'high' && !task.completed) {
        urgentTasks.push(task);
    }
});

console.log(`Found ${urgentTasks.length} urgent tasks`);
// end::filter-results[]

// tag::transform-results[]
// Transform results during iteration
const query = database.createQuery('SELECT * FROM tasks');

const taskSummaries = [];
await query.execute(row => {
    const task = row.tasks;

    // Transform to summary format
    taskSummaries.push({
        id: task._id,
        title: task.title,
        status: task.completed ? 'Done' : 'Pending',
        daysOld: calculateDaysOld(task.createdAt)
    });
});
// end::transform-results[]

// tag::async-query-callback[]
// Async callback for processing
const query = database.createQuery('SELECT * FROM tasks');

await query.execute(async (row) => {
    const task = row.tasks;

    // Can perform async operations
    await saveToCache(task);
    await updateUI(task);

    // Query waits for callback to complete
});

console.log('All results processed asynchronously');
// end::async-query-callback[]

// tag::query-error-handling[]
// Error handling for queries
try {
    const query = database.createQuery('SELECT * FROM tasks WHERE priority > $minPriority');

    const results = await query.execute({ minPriority: 5 });

    console.log(`Found ${results.length} high priority tasks`);
} catch (error) {
    if (error instanceof N1QLParseError) {
        console.error('Invalid query syntax:', error.message);
    } else if (error instanceof InterruptedQueryError) {
        console.error('Query was interrupted');
    } else {
        console.error('Query failed:', error);
    }
}
// end::query-error-handling[]

// tag::check-query-completion[]
// Check if query completed
const query = database.createQuery('SELECT * FROM tasks');

let count = 0;
const completed = await query.execute(row => {
    count++;
    // Process row
});

if (completed) {
    console.log(`Query completed successfully, processed ${count} rows`);
} else {
    console.log('Query was interrupted');
}
// end::check-query-completion[]

// tag::interrupt-query[]
// Interrupt a running query
const query = database.createQuery('SELECT * FROM tasks');

// Start query execution
const executePromise = query.execute(row => {
    // Long-running processing
    processRow(row);
});

// Interrupt after timeout
setTimeout(() => {
    query.interrupt();
    console.log('Query interrupted');
}, 5000);

try {
    await executePromise;
} catch (error) {
    if (error instanceof InterruptedQueryError) {
        console.log('Query was interrupted as expected');
    }
}
// end::interrupt-query[]

// tag::blob-in-results[]
// Working with blobs in results
const query = database.createQuery(`
    SELECT title, attachment
    FROM documents
    WHERE attachment IS NOT NULL
`);

const results = await query.execute();

for (const row of results) {
    if (row.attachment) {
        // Get blob data
        const blob = row.attachment;
        const url = blob.getURL();  // Get URL for display
        const data = await blob.getArrayBuffer();  // Get binary data

        console.log(`Document: ${row.title}`);
        console.log(`Attachment size: ${blob.length} bytes`);
    }
}
// end::blob-in-results[]

// tag::typescript-query[]
// Type-safe query with TypeScript
interface Task {
    type: 'task';
    title: string;
    completed: boolean;
    priority: number;
    createdAt: string;
}

interface TaskResult {
    title: string;
    completed: boolean;
    priority: number;
}

// tag::param-query[]
// Create parameterized query
const query = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = $completed
    AND priority >= $minPriority
    ORDER BY createdAt DESC
`);

// Set parameters using the parameters property
query.parameters = {
    completed: false,
    minPriority: 3
};

// Execute with parameters
const results = await query.execute();
console.log(`Found ${results.length} high priority incomplete tasks`);
// end::param-query[]

const query = database.createQuery<TaskResult>(`
    SELECT title, completed, priority
    FROM tasks
    WHERE priority >= $minPriority
    ORDER BY priority DESC
`);

const results = await query.execute<TaskResult>({ minPriority: 3 });

// TypeScript provides full type checking
results.forEach((task: TaskResult) => {
    console.log(`${task.title} - Priority: ${task.priority}`);
});
// end::typescript-query[]

function processRow(task: any) {
    // Process task
}

function calculateDaysOld(date: string): number {
    const created = new Date(date);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

async function saveToCache(task: any) {
    // Save to cache
}

async function updateUI(task: any) {
    // Update UI
}

