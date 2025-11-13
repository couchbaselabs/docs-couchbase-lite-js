import type { ReplicatorError} from "@couchbase/lite-js";
import { Database, DocID, DocumentFlags, Replicator, type CBLDocument, type ReplicatorConfig } from "@couchbase/lite-js";

{
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
    const replicatorConfig: ReplicatorConfig = {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::config-target[]
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp', // <.>
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
// end::config-target[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::basic-authentication[]
    const replicatorConfig: ReplicatorConfig = {
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
}

// tag::session-authentication[]
// Session auth is not supported in JavaScript
// end::session-authentication[]

{
// tag::custom-headers[]
// Custom headers are not supported in JavaScript
// end::custom-headers[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::push-filter[]
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                push: {
                    filter: (doc, flags) => { // <.>
                    // Only push documents that are not deleted
                        if (flags === DocumentFlags.deleted) {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::pull-filter[]
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                pull: {
                    filter: (doc, flags) => {
                    // Skip deleted documents
                        if (flags === DocumentFlags.deleted) {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };

    // tag::start-replicator[]
    // Create replicator
    const replicator = new Replicator(replicatorConfig); // <.>

    // Start replication
    await replicator.run(); // <.>
    console.log('Replication started');
// end::start-replicator[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
    const replicator = new Replicator(replicatorConfig);

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

            if (status.status === 'stopped') {
            // App logic here to determine if a restart is warranted
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
    const replicator = new Replicator(replicatorConfig);

    // tag::document-replication-listener[]
    // Monitor individual document replication
    replicator.onDocuments = (collection, direction, documents) => {
        console.log(`${direction} - ${documents.length} documents in ${collection.name}`);

        for (const doc of documents) {
            if (doc.error) {
                console.error(`Error ${direction}ing ${doc.docID}:`, doc.error);
            } else if (doc.deleted) {
                console.log(`Document ${doc.docID} was deleted`);
            } else {
                console.log(`Document ${doc.docID} ${direction}ed successfully`);
            }
        }
    };
// end::document-replication-listener[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
    const replicator = new Replicator(replicatorConfig);


    // Check if there are documents waiting to be pushed
    // const tasksCollection = await database.collections.tasks;

    // // Get pending document IDs for the collection
    // const pendingDocs = await replicator.getPendingDocumentIDs(tasksCollection);

    // if (pendingDocs.length > 0) {
    //     console.log(`${pendingDocs.length} documents pending push`);
    //     console.log('Pending document IDs:', pendingDocs);
    // } else {
    //     console.log('No documents pending push');
    // }

// // Check if a specific document is pending
// const docId = 'task-123';
// const isPending = await replicator.isDocumentPending(tasksCollection, docId);
// console.log(`Document ${docId} is ${isPending ? 'pending' : 'not pending'}`);
// tag::pending-documents[]
// Note: The getPendingDocumentIDs and isDocumentPending methods are not yet implemented in this version.
// end::pending-documents[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
    const replicator = new Replicator(replicatorConfig);

    // tag::stop-replicator[]
    // Stop the replicator
    replicator.stop();
    console.log('Replication stopped');
// end::stop-replicator[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});
    const replicatorConfig: ReplicatorConfig = { database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: { pull: {}, push: {} }
        }
    };
    const replicator = new Replicator(replicatorConfig);

    // tag::error-handling[]
    // Monitor for network errors
    replicator.onStatusChange = (status) => {
        if (status.error) {
            const error = status.error as ReplicatorError;

            console.error('Replication error:', error.message);
            switch (error.code) {
                case 401:
                    console.error('Unauthorized - check credentials');
                    break;
                case 404:
                    console.error('Database not found on server');
                    break;
                case 500:
                case 502:
                case 503:
                case 504:
                    console.log('Server error');
                    break;
                case 1001:
                    console.log('Web Socket hung up');
                    break;
                default:
                    console.error('Unexpected error code:', error.code);
            }
        }
    };
// end::error-handling[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::collection-config[]
    // Configure different sync modes for different collections
    const replicatorConfig: ReplicatorConfig = {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::document-ids-filter[]
    // Only sync specific documents
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                pull: {},
                push: {},
                documentIDs: [DocID('task-1'), DocID('task-2'), DocID('task-3')]
            }
        }
    };

    const replicator = new Replicator(replicatorConfig);
// end::document-ids-filter[]
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::reset-checkpoint[]
    // Reset checkpoint to re-sync all documents
    const replicatorConfig: ReplicatorConfig = {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::conflict-resolver[]
    // Configure custom conflict resolution
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                pull: {
                    conflictResolver: async (local, remote) => {
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
}

{
    const database = await Database.open({name: 'myapp', version: 1, collections: {tasks: {}}});

    // tag::advanced-config[]
    // Comprehensive replicator configuration
    const replicatorConfig: ReplicatorConfig = {
        database: database,
        url: 'wss://sync-gateway.example.com:4984/myapp',
        collections: {
            tasks: {
                pull: {
                    filter: (doc, flags) => flags !== DocumentFlags.deleted,
                    conflictResolver: async (local, remote) => {
                    // Custom conflict resolution logic
                        const remoteUpdatedAt = remote?.updatedAt || 0;
                        const localUpdatedAt = local?.updatedAt || 0;
                        return remoteUpdatedAt > localUpdatedAt ? remote : local;
                    }
                },
                push: {
                    filter: (doc, flags) => {
                        return flags !== DocumentFlags.deleted && doc.synced !== false;
                    }
                },
                resetCheckpoint: false // Don't reset checkpoint
            }
        },
        credentials: {
            username: 'user@example.com',
            password: 'password'
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
}