// tag::simple-replication[]
// Open database
const database = await Database.open({
    name: 'myapp',
    version: 1,
    collections: {
        tasks: {},
        users: {}
    }
});

// Configure replicator
const replicatorConfig = {
    database: database, // <.>
    url: 'wss://sync-gateway.example.com:4984/myapp', 
    collections: { // <.>
        tasks: { pull: {}, push: {} },
        users: { pull: {}, push: {} }
    },
    credentials: { // <.>
        username: 'user@example.com',
        password: 'password'
    }
};

// Create replicator
const replicator = new Replicator(replicatorConfig); // <.>

// Add status change listener
replicator.onStatusChange = (status) => { // <.>
    console.log('Replication status:', status.status);
    if (status.error) {
        console.error('Replication error:', status.error);
    }
};

// Start replication
await replicator.run(); // <.>
// end::simple-replication[]

// tag::config-target[]
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp', // <.>
    collections: {
        tasks: { pull: {}, push: {} }
    }
};
// end::config-target[]

// tag::config-sync-mode[]
// Configure bi-directional continuous replication
const bidirectionalConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {}, // Pull changes from server
            push: {}  // Push changes to server
        }
    }
};

// Configure pull-only replication
const pullOnlyConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {} // Only pull, no push
        }
    }
};

// Configure push-only replication
const pushOnlyConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            push: {} // Only push, no pull
        }
    }
};
// end::config-sync-mode[]


// tag::basic-authentication[]
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} }
    },
    credentials: {
        username: 'user@example.com',
        password: 'password'
    }
};

const replicator = new Replicator(replicatorConfig);
// end::basic-authentication[]

// tag::session-authentication[]
// First, create a session with Sync Gateway
const response = await fetch('https://sync-gateway.example.com:4984/myapp/_session', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: 'user@example.com',
        password: 'password'
    })
});

const sessionData = await response.json();

// Use the session ID for authentication
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} }
    },
    credentials: {
        session: sessionData.session_id
    }
};

const replicator = new Replicator(replicatorConfig);
// end::session-authentication[]

// tag::custom-headers[]
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: { pull: {}, push: {} }
    },
    headers: {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer token123'
    }
};

const replicator = new Replicator(replicatorConfig);
// end::custom-headers[]

// tag::push-filter[]
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            push: {
                filter: (doc, flags) => { // <.>
                    // Only push documents that are not deleted
                    if (flags.deleted) {
                        return false;
                    }

                    // Only push tasks that are completed
                    return doc.completed === true;
                }
            }
        }
    }
};

const replicator = new Replicator(replicatorConfig);
// end::push-filter[]

// tag::pull-filter[]
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {
                filter: (doc, flags) => {
                    // Skip deleted documents
                    if (flags.deleted) {
                        return false;
                    }

                    // Only pull tasks assigned to current user
                    return doc.assignedTo === 'currentUser@example.com';
                }
            }
        }
    }
};

const replicator = new Replicator(replicatorConfig);
// end::pull-filter[]

// tag::start-replicator[]
// Create replicator
const replicator = new Replicator(replicatorConfig); // <.>

// Start replication
await replicator.run(); // <.>
console.log('Replication started');
// end::start-replicator[]

// tag::replication-status[]
// Monitor replication status
replicator.onStatusChange = (status) => {
    console.log('Replication status:', status.status);

    // Check progress
    if (status.pulledRevisions !== undefined) {
        console.log('Documents pulled:', status.pulledRevisions);
    }

    if (status.pushedRevisions !== undefined) {
        console.log('Documents pushed:', status.pushedRevisions);
    }

    // Handle errors
    if (status.error) {
        console.error('Replication error:', status.error);

        // Check if it's a recoverable error
        if (status.status === 'offline') {
            console.log('Replicator is offline, will retry...');
        } else if (status.status === 'stopped') {
            console.log('Replicator stopped due to error');
        }
    }

    // Handle different states
    switch (status.status) {
        case 'connecting':
            console.log('Connecting to server...');
            break;
        case 'busy':
            console.log('Actively transferring data');
            break;
        case 'idle':
            console.log('Caught up with server');
            break;
        case 'stopped':
            console.log('Replication stopped');
            break;
    }
};
// end::replication-status[]

// tag::document-replication-listener[]
// Monitor individual document replication
replicator.onDocuments = (collection, direction, documents) => {
    console.log(`${direction} - ${documents.length} documents in ${collection.name}`);

    for (const doc of documents) {
        if (doc.error) {
            console.error(`Error ${direction}ing ${doc.id}:`, doc.error);
        } else if (doc.flags?.deleted) {
            console.log(`Document ${doc.id} was deleted`);
        } else {
            console.log(`Document ${doc.id} ${direction}ed successfully`);
        }
    }
};
// end::document-replication-listener[]

// tag::pending-documents[]
// Check if there are documents waiting to be pushed
const tasksCollection = await database.collection('tasks');

// Get pending document IDs for the collection
const pendingDocs = await replicator.getPendingDocumentIDs(tasksCollection);

if (pendingDocs.length > 0) {
    console.log(`${pendingDocs.length} documents pending push`);
    console.log('Pending document IDs:', pendingDocs);
} else {
    console.log('No documents pending push');
}

// Check if a specific document is pending
const docId = 'task-123';
const isPending = await replicator.isDocumentPending(tasksCollection, docId);
console.log(`Document ${docId} is ${isPending ? 'pending' : 'not pending'}`);
// end::pending-documents[]

// tag::stop-replicator[]
// Stop the replicator
replicator.stop();
console.log('Replication stopped');
// end::stop-replicator[]

// tag::error-handling[]
// Monitor for network errors
replicator.onStatusChange = (status) => {
    if (status.error) {
        const error = status.error;

        console.error('Replication error:', error.message);

        // Check error code if available
        if (error.code) {
            switch (error.code) {
                case 401:
                    console.error('Unauthorized - check credentials');
                    break;
                case 404:
                    console.error('Database not found on server');
                    break;
                case 408:
                    console.log('Request timeout - will retry');
                    break;
                case 429:
                    console.log('Too many requests - will retry');
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    console.log('Server error - will retry');
                    break;
                case 1001:
                    console.log('DNS resolution error - will retry');
                    break;
                default:
                    console.error('Unexpected error code:', error.code);
            }
        }

        // Check replicator status after error
        if (status.status === 'stopped') {
            console.log('Replicator stopped - permanent error');
        } else if (status.status === 'offline') {
            console.log('Replicator offline - will retry connection');
        }
    }
};
// end::error-handling[]

// tag::collection-config[]
// Configure different sync modes for different collections
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        // Bi-directional sync for tasks
        tasks: {
            pull: {},
            push: {}
        },
        // Pull-only for reference data
        categories: {
            pull: {}
        },
        // Push-only for logs
        logs: {
            push: {}
        }
    },
    credentials: {
        username: 'user@example.com',
        password: 'password'
    }
};

const replicator = new Replicator(replicatorConfig);
// end::collection-config[]

// tag::document-ids-filter[]
// Only sync specific documents
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {},
            push: {},
            documentIDs: ['task-1', 'task-2', 'task-3']
        }
    }
};

const replicator = new Replicator(replicatorConfig);
// end::document-ids-filter[]

// tag::reset-checkpoint[]
// Reset checkpoint to re-sync all documents
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {},
            push: {},
            resetCheckpoint: true
        }
    }
};

const replicator = new Replicator(replicatorConfig);
// end::reset-checkpoint[]

// tag::conflict-resolver[]
// Configure custom conflict resolution
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {
                conflictResolver: async (documentID, local, remote) => {
                    // Use remote version if local is deleted
                    if (!local) {
                        return remote;
                    }

                    // Use local version if remote is deleted
                    if (!remote) {
                        return local;
                    }

                    // Merge based on timestamps
                    const localTime = local.updatedAt || 0;
                    const remoteTime = remote.updatedAt || 0;

                    if (remoteTime > localTime) {
                        return remote;
                    } else {
                        return local;
                    }
                }
            },
            push: {}
        }
    }
};

const replicator = new Replicator(replicatorConfig);
// end::conflict-resolver[]

// tag::advanced-config[]
// Comprehensive replicator configuration
const replicatorConfig = {
    database: database,
    url: 'wss://sync-gateway.example.com:4984/myapp',
    collections: {
        tasks: {
            pull: {
                filter: (doc, flags) => !flags.deleted,
                conflictResolver: async (id, local, remote) => {
                    // Custom conflict resolution logic
                    return remote?.updatedAt > local?.updatedAt ? remote : local;
                }
            },
            push: {
                filter: (doc, flags) => {
                    return !flags.deleted && doc.synced !== false;
                }
            },
            documentIDs: null, // Sync all documents
            resetCheckpoint: false // Don't reset checkpoint
        }
    },
    credentials: {
        username: 'user@example.com',
        password: 'password'
    },
    headers: {
        'X-App-Version': '1.0.0'
    }
};

const replicator = new Replicator(replicatorConfig);

// Set up comprehensive monitoring
replicator.onStatusChange = (status) => {
    console.log('Status:', status.status);
    if (status.error) console.error('Error:', status.error);
};

replicator.onDocuments = (collection, direction, documents) => {
    console.log(`${direction}: ${documents.length} docs`);
};

// Start replication
await replicator.run();
// end::advanced-config[]