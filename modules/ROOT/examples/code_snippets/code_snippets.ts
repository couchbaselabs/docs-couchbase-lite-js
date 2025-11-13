import {
    Database,
    Replicator,
    DocID,
    LogCategory,
    N1QLParseError,
    InterruptedQueryError,
    NewBlob,
    Blob as CBLBlob,
    type DatabaseConfig,
    type ReplicatorConfig,
    type CBLDictionary,
    type JSONObject,
    type JSONArray, type PullConflictResolver, type CBLDocument,
    type QueryAliases,
    type JSONValue,
} from '@couchbase/lite-js';
import * as logtape from '@logtape/logtape';

// Define document types for collections
// tag::database-schema[]
interface Task {
    type: 'task';
    title: string;
    completed: boolean;
    priority: number;
    createdAt: string;
}

// Note: Import as { Blob as CBLBlob } from @couchbase/lite-js
// to avoid conflict with the standard Blob type.
interface User {
    type: 'user';
    username: string;
    email: string;
    role: string;
    avatar: CBLBlob | null;
}

// Define database schema
interface AppSchema {
    tasks: Task;
    users: User;
}
// end::database-schema[]


const defaultConfig: DatabaseConfig<AppSchema> = {
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {},
        users: {}
    }
};

{
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
}

{
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

    const database = await Database.open(configWithIndexes);
    console.log('Database opened:', database.name);
    // end::open-database-with-indexes[]
}

const database = await Database.open(defaultConfig);

{
    // Open database with encryption
    // tag::open-database-encrypted[]
    const encryptedConfig: DatabaseConfig = {
        name: 'secure-app', //<.>
        version: 1,
        password: 'my-secure-password', //<.>
        collections: {
            users: {
                indexes: ['username', 'email'] //<.>
            }
        }
    };

    const secureDb = await Database.open(encryptedConfig);
    // end::open-database-encrypted[]

    // Reopen encrypted database with password
    // tag::reopen-encrypted-database[]
    await secureDb.reopen('my-secure-password');
    // end::reopen-encrypted-database[]

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
}

{
    // Close the database
    // tag::close-database[]
    database.close();
    console.log('Database closed');
    // end::close-database[]
}

{
    // Reopen a closed database
    // tag::reopen-database[]
    await database.reopen();
    console.log('Database reopened');
    // end::reopen-database[]
}

{
    // Close and delete database
    // tag::delete-database[]
    database.close();
    await Database.delete('myapp');
    console.log('Database deleted');
    // end::delete-database[]
}

{
    // Check if database exists
    // tag::database-exists[]
    // This is not supported yet.
    // end::database-exists[]
    /*
    const exists = await Database.exists('myapp');
    if (exists) {
        console.log('Database exists');
    } else {
        console.log('Database does not exist');
    }
    */
}

{
    // Compact database to reclaim space
    // tag::database-maintenance[]
    await database.performMaintenance('compact');
    console.log('Database compacted');
    // end::database-maintenance[]
}

{
    // Check storage quota
    // tag::check-storage-quota[]
    if (navigator.storage && navigator.storage.estimate) {
        const {quota = 0, usage = 0} = await navigator.storage.estimate();
        console.log('Quota:', quota);
        console.log('Usage:', usage);
        console.log('Available:', quota - usage);
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
}

{
    // Access a collection
    // tag::access-collection[]
    const tasks = database.collections.tasks;
    const users = database.collections.users;
    // end::access-collection[]

    // Get document count in collection
    // tag::get-collection-count[]
    const docCount = await tasks.count();
    console.log('Document count:', docCount);
    // end::get-collection-count[]

    // List all collection names
    // tag::list-collections[]
    const collectionNames = database.collectionNames;
    for (const name of collectionNames) {
        console.log('Collection:', name);
    }
    // end::list-collections[]
}

{
    interface Ariline {
        type: 'airline';
        name: string;
        icao: string;
    }

    interface Hotel {
        type: 'hotel';
        name: string;
        city: string;
        country: string;
    }

    // Declare collections with custom scopes
    // tag::declare-custom-scope[]
    interface TravelAppSchema {
        'inventory.airline': Ariline;
        'inventory.hotel': Hotel;
    }

    const travelConfig: DatabaseConfig<TravelAppSchema> = {
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

    const travelDatabase = await Database.open(travelConfig);
    // end::declare-custom-scope[]

    // Access collection in custom scope
    // tag::access-custom-scope-collection[]
    const inventoryAirlines = travelDatabase.collections['inventory.airline'];
    // end::access-custom-scope-collection[]
}

{
    interface Project {
        type: 'project';
        name: string;
    }

    interface MySchema {
        tasks: Task;
        users: User;
        projects: Project;
    }

    // Add a new collection (requires close and reopen)
    // tag::add-collection[]
    database.close();

    const updatedConfig: DatabaseConfig<MySchema> = {
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
}

{
    const tasks = database.collections.tasks;
    // Create a document with auto-generated ID
    // tag::create-document[]
    // Create a new CBL document (with an auto-generated ID)
    const task = tasks.createDocument(null, {
        type: 'task',
        title: 'Auto ID task',
        completed: false,
        priority: 0,
        createdAt: new Date().toISOString()
    });
    await tasks.save(task);
    // end::create-document[]
}

{
    const tasks = database.collections.tasks;
    // Create a document with specific ID
    // tag::create-document-with-id[]
    const docId = DocID('task-001');
    const taskWithId = tasks.createDocument(docId, {
        type: 'task',
        title: 'Specific ID task',
        completed: false,
        priority: 0,
        createdAt: new Date().toISOString(),
    });
    await tasks.save(taskWithId);
    // end::create-document-with-id[]
}

{
    const tasks = database.collections.tasks;
    // Retrieve a document by ID
    // tag::get-document[]
    const docId = DocID('task-001');
    const doc = await tasks.getDocument(docId);
    if (doc) {
        console.log('Task:', doc.title);
    } else {
        console.log('Document not found');
    }
    // end::get-document[]
}

{
    const tasks = database.collections.tasks;
    // Update a document
    // tag::update-document[]
    const docId = DocID('task-001');
    const docToUpdate = await tasks.getDocument(docId);
    if (docToUpdate) {
        docToUpdate.completed = true;
        await tasks.save(docToUpdate);
        console.log('Document updated');
    }
    // end::update-document[]
}

{
    const tasks = database.collections.tasks;
    // Delete a document
    // tag::delete-document[]
    const docId = DocID('task-001');
    const deleteDoc = await tasks.getDocument(docId);
    if (deleteDoc) {
        await tasks.delete(deleteDoc);
        console.log('Document deleted');
    }
    // end::delete-document[]
}

{
    const tasks = database.collections.tasks;
    // Save multiple documents in a transaction
    // tag::save-multiple-documents[]
    const newTasks = [
        tasks.createDocument(DocID('task-002'), {
            type: 'task',
            title: 'Task 2',
            completed: false,
            priority: 0,
            createdAt: new Date().toISOString()
        }),
        tasks.createDocument(DocID('task-003'), {
            type: 'task',
            title: 'Task 3',
            completed: false,
            priority: 0,
            createdAt: new Date().toISOString()
        })
    ];

    await tasks.updateMultiple({save: newTasks});
    console.log('Multiple documents saved');
    // end::save-multiple-documents[]
}

{
    const tasks = database.collections.tasks;
    // Permanently purge a document
    // tag::purge-document[]
    const docId = DocID('task-001');
    await tasks.purge(docId);
    console.log('Document purged');
    // end::purge-document[]
}

{
    const tasks = database.collections.tasks;
    const doc = await tasks.getDocument(DocID('task-001'));
    if (doc) {
        // tag::save-conflict-handler[]
        // Use my changes
        await tasks.save(doc, (_mine, _theirs /* conflicting */) => {
            return 'replace';
        });

        // Discard my change
        await tasks.save(doc, (_mine, _theirs /* conflicting */) => {
            return 'revert';
        });

        // Abort with an error
        await tasks.save(doc, (_mine, _theirs /* conflicting */) => {
            return 'fail';
        });
        // end::save-conflict-handler[]
    }
}

{
    const tasks = database.collections.tasks;
    const doc = await tasks.getDocument(DocID('task-001'));
    if (doc) {
        // tag::custom-merge-save[]
        // Use my changes
        await tasks.save(doc, (mine, theirs /* conflicting */) => {
            // Delete always wins
            if (!theirs) return 'revert';

            // Custom merge
            mine.title = `${mine.title} and ${theirs.title}`;
            mine.completed = !!(mine.completed && theirs.completed);
            mine.priority = Math.min(mine.priority, theirs.priority);
            mine.createdAt = new Date().toISOString();
            return 'replace';
        });
        // end::custom-merge-save[]
    }
}

{
    const tasks = database.collections.tasks;
    // Listen for collection changes
    // tag::collection-change-listener[]
    const token = tasks.addChangeListener(changes => {
        console.log(`${changes.size} documents changed`);
        for (const [docId, change] of changes) {
            console.log('Changed document:', docId, change);
        }
    });

    // Remove listener when done
    token.remove();
    // end::collection-change-listener[]
}

{
    const tasks = database.collections.tasks;
    // Listen for specific document changes
    // tag::document-change-listener[]
    const docId = DocID('task-001');
    const token = tasks.addDocumentChangeListener(docId, change => {
        console.log('Document changed:', change.id);
    });

    // Remove listener
    token.remove();
    // end::document-change-listener[]
}

{
    // Create a query
    // tag::create-query[]
    const query = database.createQuery(`
        SELECT tasks.*
        FROM tasks
        WHERE completed = false
        ORDER BY createdAt DESC
    `);
    // end::create-query[]

    // Execute query and iterate results
    // tag::execute-query[]
    const results = await query.execute<Task>();

    for (const row of results) {
        console.log(`Task: ${row.title}`);
    }

    console.log(`Found ${results.length} tasks`);
    // end::execute-query[]

    // Execute query with row callback
    // tag::query-with-callback[]
    await query.execute<Task>(row => {
        console.log(`Task: ${row.title}`);
    });
    // end::query-with-callback[]

    // Get query explanation
    // tag::query-explanation[]
    const explanation = query.explanation;
    console.log('Query plan:', explanation);
    // end::query-explanation[]
}

{
    // Create parameterized query
    // tag::parameterized-query[]
    const paramQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = $completed
        ORDER BY createdAt DESC
    `);

    // Execute with parameters
    paramQuery.parameters = {completed: true};
    const completedResults = await paramQuery.execute();
    // end::parameterized-query[]
}

{
    // Create a live query
    // tag::create-live-query[]
    const liveQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = false
        ORDER BY createdAt DESC
    `);

    // Add change listener
    const listenerToken = liveQuery.addChangeListener(results => {
        console.log('Query results updated:', results.length);
        // Update UI
        updateTaskList(results);
    });
    // end::create-live-query[]

    // Stop a live query
    // tag::stop-live-query[]
    listenerToken.remove();
    // end::stop-live-query[]

    function updateTaskList(results: QueryAliases[]) {
        // Update UI with query results
    }
}

{
    // Create indexes in database configuration
    // tag::create-indexes-in-config[]
    const config: DatabaseConfig = {
        name: 'myapp',
        version: 1,
        collections: {
            tasks: {
                indexes: ['title', 'completed', 'createdAt']
            }
        }
    };

    const db = await Database.open(config);
    // end::create-indexes-in-config[]
}

{
    // Create composite index
    // tag::create-composite-index[]
    const config: DatabaseConfig = {
        name: 'myapp',
        version: 1,
        collections: {
            tasks: {
                indexes: [
                    { on: ['completed, createdAt'] }, // Composite index
                    'title'                         // Single property index
                ]
            }
        }
    };

    const db = await Database.open(config);
    // end::create-composite-index[]
}

{
    // Create a replicator
    // tag::create-replicator[]
    const config: ReplicatorConfig = {
        // This unknown cast will be unnecessary in the future version.
        database: database as unknown as Database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: { continuous: true }, push: { continuous: true } },
            users: { pull: { continuous: true }, push: { continuous: true } }
        },
    };

    const replicator = new Replicator(config);
    // end::create-replicator[]
}

{
    // Configure replicator with authentication
    // tag::replicator-authentication[]
    const config: ReplicatorConfig = {
        // This unknown cast will be unnecessary in the future version.
        database: database as unknown as Database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {pull: {continuous: true}, push: {continuous: true}}
        },
        credentials: {
            username: 'user@example.com',
            password: 'password'
        },
    };

    const replicator = new Replicator(config);
    // end::replicator-authentication[]

    // Start replication
    // tag::start-replication[]
    await replicator.run();
    console.log('Replication started');
    // end::start-replication[]

    // Stop replication
    // tag::stop-replication[]
    replicator.stop();
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
}

{
    // One-shot replication
    // tag::one-shot-replication[]
    const config: ReplicatorConfig = {
        database: database as unknown as Database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: { continuous: false }, push: { continuous: false } }
        }
    };

    const replicator = new Replicator(config);
    await replicator.run();
    console.log('One-shot replication complete');
    // end::one-shot-replication[]
}

{
    //Conflict Resolution Strategies

    // tag::local-win-resolver[]
    const localWinsResolver: PullConflictResolver = async (local, remote) => {
        return local;
    };
    // end::local-win-resolver[]

    // tag::remote-win-resolver[]
    const remoteWinsResolver: PullConflictResolver = async (local, remote) => {
        return remote;
    };
    // end::remote-win-resolver[]

    // tag::merge-resolver[]
    const mergeResolver: PullConflictResolver = async (local, remote) => {
        if (local && remote) {
            return { ...local, ...remote } as CBLDocument;
        } else {
            return local ?? remote;
        }
    };
    // end::remote-win-resolver[]

    // tag::delete-resolver[]
    const deleteResolver: PullConflictResolver = async (local, remote) => {
        return null;
    };
    // end::delete-resolver[]

    // tag::conflict-resolver-config
    const config: ReplicatorConfig = {
        database: database as unknown as Database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                pull: { conflictResolver: remoteWinsResolver, continuous: true },
                push: { continuous: true}
            }
        }
    };
    // end::conflict-resolver-config
}

{
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
}

{
    // Configure logging for database operations
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
    // tag::modify-indexes[]
    // Close database first
    database.close();

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
}

{
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

    const db = await Database.open(eventConfig);
    // end::date-index[]
}

{
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

    const db = await Database.open(emailConfig);
    // end::high-selectivity[]
}

{
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

    const db = await Database.open(taskConfig);

    // Better: combine with high-selectivity queries
    const query = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = false AND assignedTo = $userId -- High selectivity filter
    `);
    // end::low-selectivity[]
}

{
    // Check IndexedDB storage usage
    // tag::storage-usage[]
    if (navigator.storage && navigator.storage.estimate) {
        const {quota = 0, usage = 0} = await navigator.storage.estimate();
        const quotaGB = (quota / (1024 ** 3)).toFixed(2);
        const usageGB = (usage / (1024 ** 3)).toFixed(2);
        const percentUsed = ((usage / quota) * 100).toFixed(1);

        console.log(`Storage: ${usageGB} GB / ${quotaGB} GB (${percentUsed}%)`);
    }
    // end::storage-usage[]
}

{
    // Query that uses indexes efficiently
    // tag::indexed-query[]
    const indexedQuery = database.createQuery(`
        SELECT *
        FROM products
        WHERE category = 'electronics' -- Uses category index
        ORDER BY price -- Uses price index
        LIMIT 50
    `);

    const results = await indexedQuery.execute();
    // end::indexed-query[]
}

{
    // Query without index - scans entire collection
    // tag::unindexed-query[]
    const unindexedQuery = database.createQuery(`
        SELECT *
        FROM products
        WHERE description LIKE '%wireless%' -- No index on description
    `);

    // This will be slow on large datasets
    const slowResults = await unindexedQuery.execute();
    // end::unindexed-query[]
}

{
    // Use LIMIT for pagination and performance
    // tag::limit-query[]
    const limitedQuery = database.createQuery(`
        SELECT *
        FROM products
        WHERE category = $category
        ORDER BY price DESC LIMIT 20
        OFFSET $offset
    `);

    // Fetch first page
    limitedQuery.parameters = {
        category: 'electronics',
        offset: 0
    };
    const page1 = await limitedQuery.execute();

    // Fetch next page
    limitedQuery.parameters = {
        category: 'electronics',
        offset: 20
    };
    const page2 = await limitedQuery.execute();
    // end::limit-query[]
}

{
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
        SELECT *
        FROM users
        WHERE email = $email
    `);

    userQuery.parameters = {email: 'user@example.com'};
    const user = await userQuery.execute();
    // end::email-pattern[]
}

{
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
        SELECT *
        FROM tasks
        WHERE status IN ('pending', 'in-progress')
          AND assignedTo = $userId
        ORDER BY priority DESC
    `);
    // end::status-pattern[]
}

{
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
        SELECT *
        FROM events
        WHERE timestamp >= $startDate
          AND timestamp <= $endDate
        ORDER BY timestamp DESC
    `);

    dateRangeQuery.parameters = {
        startDate: Date.now() - (7 * 24 * 60 * 60 * 1000),  // 7 days ago
        endDate: Date.now()
    };
    const recentEvents = await dateRangeQuery.execute();
    // end::date-range-pattern[]
}

{
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
        SELECT *
        FROM products
        WHERE category = $category
          AND subcategory = $subcategory
        ORDER BY name
    `);

    categoryQuery.parameters = {
        category: 'electronics',
        subcategory: 'laptops'
    };
    const laptops = await categoryQuery.execute();
    // end::category-pattern[]
}

{
    // Performance testing pattern
    // tag::performance-test[]
    async function testQueryPerformance() {
        // Test without index
        const startUnindexed = performance.now();
        const unindexedResults = await database.createQuery(`
            SELECT *
            FROM products
            WHERE description LIKE '%test%'
        `).execute();
        const timeUnindexed = performance.now() - startUnindexed;

        console.log(`Unindexed query: ${timeUnindexed.toFixed(2)}ms`);
        console.log(`Results: ${unindexedResults.length}`);

        // Test with index
        const startIndexed = performance.now();
        const indexedResults = await database.createQuery(`
            SELECT *
            FROM products
            WHERE category = 'electronics'
        `).execute();
        const timeIndexed = performance.now() - startIndexed;

        console.log(`Indexed query: ${timeIndexed.toFixed(2)}ms`);
        console.log(`Results: ${indexedResults.length}`);
        console.log(`Speedup: ${(timeUnindexed / timeIndexed).toFixed(1)}x`);
    }
    // end::performance-test[]
}

{
    // Migration strategy for adding indexes
    // tag::index-migration[]
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

        console.log('Current version:', currentDb.config.version);

        // Step 2: Close database
        currentDb.close();

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

        console.log('Migrated to version:', migratedDb.config.version);

        return migratedDb;
    }

    await migrateIndexes();
    // end::index-migration[]
}

{
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

    // Simple WHERE clause
    // tag::where-clause[]
    const whereQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = false
    `);

    // Multiple conditions
    const multiWhereQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = false
          AND type = 'urgent'
    `);
    // end::where-clause[]

    // Using AND
    // tag::logical-operators[]
    const andQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE completed = false
          AND priority = 'high'
    `);

    // Using OR
    const orQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE priority = 'high'
           OR priority = 'critical'
    `);

    // Using NOT
    const notQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE NOT completed
    `);
    // end::logical-operators[]

    // LIKE with wildcards
    // tag::pattern-matching[]
    const likeQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE title LIKE 'Learn%'
    `);

    // Contains pattern
    const containsQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE title LIKE '%Couchbase%'
    `);

    // Single character wildcard
    const singleQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE title LIKE 'Task_'
    `);
    // end::pattern-matching[]

    // Regular expression matching
    // tag::regex-matching[]
    const regexQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE REGEXP_LIKE(title, '^[A-Z].*')
    `);

    // Check if contains pattern
    const regexContainsQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE REGEXP_CONTAINS(description, 'important|urgent')
    `);
    // end::regex-matching[]

    // Order ascending
    // tag::order-by[]
    const ascQuery = database.createQuery(`
        SELECT *
        FROM tasks
        ORDER BY createdAt ASC
    `);

    // Order descending
    const descQuery = database.createQuery(`
        SELECT *
        FROM tasks
        ORDER BY createdAt DESC
    `);

    // Multiple order columns
    const multiOrderQuery = database.createQuery(`
        SELECT *
        FROM tasks
        ORDER BY priority DESC, createdAt ASC
    `);
    // end::order-by[]

    // Limit results
    // tag::limit-offset[]
    const limitQuery = database.createQuery(`
        SELECT *
        FROM tasks LIMIT 10
    `);

    // Pagination with LIMIT and OFFSET
    const pageQuery = database.createQuery(`
        SELECT *
        FROM tasks
        ORDER BY createdAt DESC LIMIT 20
        OFFSET 40
    `);
    // end::limit-offset[]

    // LEFT OUTER JOIN
    // tag::join[]
    const joinQuery = database.createQuery(`
        SELECT tasks.title, users.username
        FROM tasks
                 LEFT OUTER JOIN users ON tasks.assignedTo = users._id
        WHERE tasks.completed = false
    `);

    const joinResults = await joinQuery.execute();
    // end::join[]

    // GROUP BY with aggregate function
    // tag::group-by[]
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

    // Array functions
    // tag::array-functions[]
    const arrayQuery = database.createQuery(`
        SELECT title,
               ARRAY_LENGTH(tags)             AS tagCount,
               ARRAY_CONTAINS(tags, 'urgent') AS isUrgent
        FROM tasks
        WHERE ARRAY_LENGTH(tags) > 0
    `);

    // Array aggregation
    const arrayAggQuery = database.createQuery(`
        SELECT category,
               ARRAY_AGG(title) AS titles
        FROM tasks
        GROUP BY category
    `);
    // end::array-functions[]

    // String manipulation
    // tag::string-functions[]
    const stringQuery = database.createQuery(`
        SELECT UPPER(title)  AS upperTitle,
               LOWER(title)  AS lowerTitle,
               LENGTH(title) AS titleLength,
               TRIM(title)   AS trimmedTitle
        FROM tasks
    `);

    // String concatenation
    const concatQuery = database.createQuery(`
        SELECT title || ' - ' || status AS fullTitle
        FROM tasks
    `);
    // end::string-functions[]

    // Date functions
    // tag::date-functions[]
    const dateQuery = database.createQuery(`
        SELECT title,
               STR_TO_MILLIS(createdAt) AS timestamp,
        MILLIS_TO_STR(STR_TO_MILLIS(createdAt)) AS formattedDate
        FROM tasks
    `);

    // Date arithmetic
    const dateRangeQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE STR_TO_MILLIS(createdAt) > STR_TO_MILLIS($startDate)
          AND STR_TO_MILLIS(createdAt) < STR_TO_MILLIS($endDate)
    `);
    // end::date-functions[]

    // Mathematical functions
    // tag::math-functions[]
    const mathQuery = database.createQuery(`
        SELECT title,
               ROUND(progress * 100) AS percentage,
               ABS(budget - spent)   AS difference,
               CEIL(duration / 24)   AS days,
               FLOOR(duration / 24)  AS wholeDays
        FROM tasks
    `);

    // Using POWER and SQRT
    const advMathQuery = database.createQuery(`
        SELECT title,
               POWER(priority, 2)   AS prioritySquared,
               SQRT(estimatedHours) AS sqrtHours
        FROM tasks
    `);
    // end::math-functions[]

    // Type checking
    // tag::type-functions[]
    const typeCheckQuery = database.createQuery(`
        SELECT title,
               TYPE(metadata)     AS metadataType,
               ISSTRING(title)    AS isTitleString,
               ISNUMBER(priority) AS isPriorityNumber,
               ISARRAY(tags)      AS isTagsArray
        FROM tasks
    `);

    // Type conversion
    const typeConvertQuery = database.createQuery(`
        SELECT TOSTRING(priority)       AS priorityString,
               TONUMBER(estimatedHours) AS hours,
               TOBOOLEAN(completed)     AS isDone
        FROM tasks
    `);
    // end::type-functions[]

    // Handling NULL and MISSING
    // tag::conditional-functions[]
    const conditionalQuery = database.createQuery(`
        SELECT title,
               IFNULL(assignedTo, 'unassigned')              AS assigned,
               IFMISSING(dueDate, 'no due date')             AS due,
               IFMISSINGORNULL(completedAt, 'not completed') AS completion
        FROM tasks
    `);

    // NULLIF and MISSINGIF
    const nullifQuery = database.createQuery(`
        SELECT title,
               NULLIF(status, 'unknown') AS validStatus,
               MISSINGIF(progress, 0)    AS nonZeroProgress
        FROM tasks
    `);
    // end::conditional-functions[]

    // Simple CASE expression
    // tag::case-expression[]
    const caseQuery = database.createQuery(`
        SELECT title,
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
        SELECT title,
               CASE
                   WHEN completed THEN 'Done'
                   WHEN dueDate < $now THEN 'Overdue'
                   WHEN dueDate < $soon THEN 'Due Soon'
                   ELSE 'On Track'
                   END AS taskStatus
        FROM tasks
    `);
    // end::case-expression[]

    // Access document metadata
    // tag::metadata[]
    const metaQuery = database.createQuery(`
        SELECT META().id       AS docId,
               META().sequence AS seq,
               title,
               completed
        FROM tasks
    `);

    // Filter by document ID
    const idQuery = database.createQuery(`
        SELECT *
        FROM tasks
        WHERE META().id = $docId
    `);
    // end::metadata[]
}

{
    // Execute and return array of all results
    // tag::execute-query-array[]
    const query = database.createQuery('SELECT tasks.* FROM tasks WHERE completed = false');
    const results = await query.execute<Task>();

    console.log(`Found ${results.length} incomplete tasks`);

    for (const row of results) {
        console.log(`Task: ${row.title}`);
    }
    // end::execute-query-array[]
}

{
    // Execute with callback for memory efficiency
    // tag::execute-query-callback[]
    const query = database.createQuery('SELECT tasks.* FROM tasks WHERE completed = false');

    let count = 0;
    await query.execute<Task>(row => {
        console.log(`Task ${++count}: ${row.title}`);
        // Process each row without storing all in memory
    });

    console.log(`Processed ${count} tasks total`);
    // end::execute-query-callback[]
}

{
    // Get column names from query
    // tag::query-column-names[]
    const query = database.createQuery(`
        SELECT title, completed, createdAt
        FROM tasks
    `);

    const columnNames = query.columnNames;
    console.log('Columns:', columnNames);  // ['title', 'completed', 'createdAt']
    // end::query-column-names[]
}

{
    // SELECT * structure
    // tag::select-star-results[]
    const starQuery = database.createQuery('SELECT * FROM tasks');
    const starResults = await starQuery.execute();

    for (const row of starResults) {
        // Results nested under collection name
        const task = row.tasks! as JSONObject;  // Access via collection name
        console.log(task.title, task.completed);
    }
    // end::select-star-results[]
}

{
    // SELECT properties structure
    // tag::select-props-results[]
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
}

{
    // Accessing result values
    // tag::access-values[]
    const query = database.createQuery('SELECT title, completed, priority FROM tasks');
    const results = await query.execute<Task>();

    for (const row of results) {
        const title = row.title;
        const completed = row.completed;
        const priority = row.priority;
        console.log(`${title}: ${completed ? 'Done' : 'Pending'} (Priority: ${priority})`);
    }
    // end::access-values[]
}

{
    // Using aliases
    // tag::result-aliases[]
    interface AliasTask {
        taskName: string;
        isDone: boolean;
        created: string;
    };

    const aliasQuery = database.createQuery(`
        SELECT title     AS taskName,
               completed AS isDone,
               createdAt AS created
        FROM tasks
    `);

    const results = await aliasQuery.execute<AliasTask>();

    for (const row of results) {
        console.log(`${row.taskName} - Done: ${row.isDone}`);
    }
    // end::result-aliases[]
}

{
    // Accessing nested properties
    // tag::nested-properties[]
    interface NestedTask {
        title: string;
        name: string;
        email: string;
        tags: string[];
    };

    const nestedQuery = database.createQuery(`
        SELECT title,
               assignee.name,
               assignee.email,
               metadata.tags
        FROM tasks
    `);

    const results = await nestedQuery.execute<NestedTask>();

    for (const row of results) {
        console.log(`Task: ${row.title}`);
        console.log(`Assigned to: ${row.name} (${row.email})`);
        console.log(`Tags: ${row.tags.join(', ')}`);
    }
    // end::nested-properties[]
}

{
    // Collect all results as array
    // tag::collect-all-results[]
    const query = database.createQuery('SELECT * FROM tasks');
    const allResults = await query.execute();

    // Now you have an array of all results
    console.log(`Total tasks: ${allResults.length}`);

    // Can use array methods
    const completedTasks = allResults.filter(row => {
        const task = row.tasks! as JSONObject;
        return task.completed;
    });
    console.log(`Completed: ${completedTasks.length}`);
    // end::collect-all-results[]
}

{
    // Process with callback for memory efficiency
    // tag::callback-results[]
    const query = database.createQuery('SELECT * FROM tasks');

    const completed = [];
    await query.execute(row => {
        const task = row.tasks! as JSONObject;
        if (task.completed) {
            completed.push(task);
        }
        // Row is processed and can be garbage collected
    });

    console.log(`Found ${completed.length} completed tasks`);
    // end::callback-results[]
}

{
    // Count results efficiently
    // tag::count-results[]
    const query = database.createQuery('SELECT COUNT(*) AS count FROM tasks WHERE completed = false');
    const results = await query.execute();

    const count = results[0].count as number;
    console.log(`Incomplete tasks: ${count}`);
    // end::count-results[]
}

{
    // Aggregate functions
    // tag::aggregate-results[]
    interface TaskStats {
        total: number;
        totalHours: number;
        avgPriority: number;
        earliest: string;
        latest: string;
    }

    const aggQuery = database.createQuery(`
        SELECT COUNT(*)            AS total,
               SUM(estimatedHours) AS totalHours,
               AVG(priority)       AS avgPriority,
               MIN(createdAt)      AS earliest,
               MAX(createdAt)      AS latest
        FROM tasks
    `);

    const results = await aggQuery.execute<TaskStats>();
    const stats = results[0];

    console.log(`Total: ${stats.total}`);
    console.log(`Total Hours: ${stats.totalHours}`);
    console.log(`Avg Priority: ${stats.avgPriority}`);
    // end::aggregate-results[]
}

{
    // GROUP BY results
    // tag::group-by-results[]
    interface GroupedResult {
        status: string;
        count: number;
        avgPriority: number;
    };

    const groupQuery = database.createQuery(`
        SELECT status,
               COUNT(*) AS count,
        AVG(priority) AS avgPriority
        FROM tasks
        GROUP BY status
    `);

    const results = await groupQuery.execute<GroupedResult>();

    for (const row of results) {
        console.log(`${row.status}: ${row.count} tasks (Avg Priority: ${row.avgPriority})`);
    }
    // end::group-by-results[]
}

{
    // JOIN results
    // tag::join-results[]
    interface JoinResult {
        title: string;
        status: string;
        username: string;
        email: string;
    };

    const joinQuery = database.createQuery(`
        SELECT tasks.title,
               tasks.status,
               users.username,
               users.email
        FROM tasks
                 LEFT OUTER JOIN users ON tasks.assignedTo = users._id
    `);

    const results = await joinQuery.execute<JoinResult>();

    for (const row of results) {
        console.log(`Task: ${row.title}`);
        if (row.username) {
            console.log(`Assigned to: ${row.username} (${row.email})`);
        } else {
            console.log('Unassigned');
        }
    }
    // end::join-results[]
}

{
    // Handling NULL and MISSING
    // tag::null-missing[]
    const query = database.createQuery(`
        SELECT title,
               assignedTo,
               dueDate,
               IFNULL(assignedTo, 'unassigned')  AS assigned,
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
}

{
    // Convert results to JSON
    // tag::results-to-json[]
    const query = database.createQuery('SELECT * FROM tasks LIMIT 10');
    const results = await query.execute();

    // Convert to JSON string
    const jsonString = JSON.stringify(results, null, 2);
    console.log(jsonString);

    // Or save to file/localStorage
    localStorage.setItem('taskResults', jsonString);
    // end::results-to-json[]
}

{
    // Type-safe query results with TypeScript
    // tag::typescript-query-results[]
    interface TaskResult {
        title: string;
        completed: boolean;
        priority: number;
        createdAt: string;
    }

    const query = database.createQuery(`
        SELECT title, completed, priority, createdAt
        FROM tasks
        WHERE completed = false
    `);

    const results = await query.execute<TaskResult>();

    // TypeScript knows the result type
    for (const row of results) {
        const title: string = row.title;  // Type-safe access
        const priority: number = row.priority;
    }
    // end::typescript-query-results[]
}

{
    // Specify result type on execute
    // tag::query-result-type[]
    interface TaskSummary {
        taskName: string;
        isDone: boolean;
    }

    const query = database.createQuery(`
        SELECT title     AS taskName,
               completed AS isDone
        FROM tasks
    `);

    const results = await query.execute<TaskSummary>();

    // Results are typed as TaskSummary[]
    results.forEach(task => {
        console.log(`${task.taskName}: ${task.isDone ? 'Done' : 'Pending'}`);
    });
    // end::query-result-type[]
}

{
    // Process results as stream without storing all
    // tag::streaming-results[]
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
}

{
    // Filter results in callback
    // tag::filter-results[]
    const query = database.createQuery('SELECT * FROM tasks');

    const urgentTasks = [];
    await query.execute(row => {
        const task = row.tasks as JSONObject;

        // Only keep urgent tasks
        if (task.priority === 'high' && !task.completed) {
            urgentTasks.push(task);
        }
    });

    console.log(`Found ${urgentTasks.length} urgent tasks`);
    // end::filter-results[]
}

{
    // Transform results during iteration
    // tag::transform-results[]
    const query = database.createQuery(
        'SELECT * FROM tasks'
    );

    const taskSummaries = [];
    await query.execute(row => {
        const task = row.tasks as JSONObject;

        // Transform to summary format
        taskSummaries.push({
            id: task._id,
            title: task.title,
            status: task.completed ? 'Done' : 'Pending',
            daysOld: calculateDaysOld(task.createdAt as string)
        });
    });
    // end::transform-results[]
}

{
    // Async callback for processing
    // tag::async-query-callback[]
    const query = database.createQuery(
        'SELECT tasks.* FROM tasks'
    );

    let asyncTasks: Promise<void>[] = [];
    await query.execute((row) => {
        asyncTasks.push(saveToCache(row));
        asyncTasks.push(updateUI(row));
    });

    await Promise.all(asyncTasks);
    console.log('All results processed asynchronously');
    // end::async-query-callback[]
}

{
    // Error handling for queries
    // tag::query-error-handling[]
    try {
        const query = database.createQuery(
            'SELECT * FROM tasks WHERE priority > $minPriority'
        );
        query.parameters = { minPriority: 5 };
        const results = await query.execute();

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
}

{
    // Check if query completed
    // tag::check-query-completion[]
    const query = database.createQuery(
        'SELECT * FROM tasks'
    );

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
}

{
    // Interrupt a running query
    // tag::interrupt-query[]
    const query = database.createQuery(
        'SELECT * FROM tasks'
    );

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
}

// Working with blobs in results
// tag::blob-in-results[]
// This is not supported yet.
// end::blob-in-results[]
/*
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
*/

{
    // Type-safe query with TypeScript
    // tag::typescript-query[]
    interface TaskResult {
        title: string;
        completed: boolean;
        priority: number;
    }

    // Create parameterized query
    // tag::param-query[]
    let query = database.createQuery(`
        SELECT *
        FROM tasks
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

    const taskResults = await query.execute<TaskResult>();

    // TypeScript provides full type checking
    taskResults.forEach((task: TaskResult) => {
        console.log(`${task.title} - Priority: ${task.priority}`);
    });
    // end::typescript-query[]
}

function processRow(task: JSONValue) {
    // Process task
}

function calculateDaysOld(date: string): number {
    const created = new Date(date);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

async function saveToCache(task: JSONValue) {
    // Save to cache
}

async function updateUI(task: JSONValue) {
    // Update UI
}

{
    // Working with blobs
    // tag::using-blobs[]
    // Create the blob from a File object
    const fileInput = document.getElementById('avatarFile') as HTMLInputElement;
    if (!fileInput?.files || fileInput.files.length === 0) {
        throw new Error('Please choose an image file first.');
    }
    const file = fileInput.files[0];
    const buffer = new Uint8Array(await file.arrayBuffer());
    const blob = new NewBlob(buffer, 'image/jpeg'); //<.>

    // Add the blob to a document
    const user: CBLDictionary = {
        type: 'user',
        username: 'jane',
        email: 'jane@email.com',
        role: 'engineer',
        avatar: blob
    };

    // Create a document and save
    const users = database.getCollection('users');
    const doc = users.createDocument(DocID("profile1"), user);
    const saved = await users.save(doc);
    // end::using-blobs[]
}

{
    // Create blob from file input
    // tag::creating-blobs-file-input[]
    const fileInput = document.getElementById('avatarFile') as HTMLInputElement;
    if (!fileInput?.files || fileInput.files.length === 0) {
        throw new Error('Please choose an image file first.');
    }
    const file = fileInput.files[0];
    const buffer = new Uint8Array(await file.arrayBuffer());
    const blob = new NewBlob(buffer, 'image/jpeg');
    // end::creating-blobs-file-input[]
}

{
    // Fetch remote binary data
    // tag::blob-fetch[]
    const response = await fetch('https://couchbase-example.com/images/avatar.jpg');
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Convert the response into binary data
    const data = await response.arrayBuffer();

    // Create a blob from the downloaded data
    const buffer = new Uint8Array(await response.arrayBuffer());
    const blob = new NewBlob(buffer, 'image/jpeg');
    // end::blob-fetch[]
}

{
    // tag::blob-retrieve[]
    const users = database.getCollection('users');
    const doc = await users.getDocument(DocID("profile1"));
    if (doc) {
        // Note: Import as { Blob as CBLBlob } from â€˜@couchbase/lite-jsâ€™ to
        // avoid conflict with the standard Blob type.
        const blob = doc.avatar as CBLBlob;
        if (blob instanceof CBLBlob) {
            // tag::blob-properties[]
            const contentType = blob.content_type ?? "None";
            const length = blob.length ?? 0;
            const digest = blob.digest;
            console.log(`Blob info:
                Content-Type: ${contentType}
                Length: ${length} bytes
                Digest: ${digest}`
            );
            // end::blob-properties[]
            const content = await blob.getContents();
            // Use content as needed
        }
    } else {
        console.log('User not found');
    }
    // end::blob-retrieve[]
}

{
    // tag::typescript-blob[]
    // Note: Import as { Blob as CBLBlob } from '@couchbase/lite-js'
    // to avoid conflict with the standard Blob type.
    interface UserSchema {
        type: 'user';
        username: string;
        email: string;
        role: string;
        avatar: CBLBlob | null;
    }

    const users = database.collections.users;
    const doc = await users.getDocument(DocID("profile1"));
    if (doc) {
        const blob = doc.avatar;
        if (blob) {
            const content = await blob.getContents();
            // Use content as needed
        }
    }
    // end::typescript-blob[]
}