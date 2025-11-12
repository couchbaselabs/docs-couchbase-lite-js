import { Database, DocID, meta, type CBLDictionary, type CBLDocument, type CollectionChange, type DatabaseConfig, type JSONObject } from "@couchbase/lite-js";

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::tojson-document[]
    // Get a document from the collection
    const users = database.getCollection("users");
    const doc = await users.getDocument(DocID("user-123"));

    if (doc) {
    // Convert document to JSON string
        const jsonString = JSON.stringify(doc);
        console.log('Document as JSON:', jsonString);

        // Parse JSON string back to object
        const parsedDoc = JSON.parse(jsonString) as CBLDocument;
        console.log('Parsed document:', parsedDoc);

        // You can also stringify with formatting
        const prettyJson = JSON.stringify(doc, null, 2);
        console.log('Pretty JSON:\n', prettyJson);
    }
    // end::tojson-document[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::query-access-json[]
    // Execute a query
    const query = database.createQuery(`
        SELECT users.* FROM users
        WHERE role = 'admin'
    `);

    const results = await query.execute();

    // Convert results to JSON string
    const jsonResults = JSON.stringify(results, null, 2);
    console.log('Query results as JSON:', jsonResults);

    // Parse JSON back to object
    const parsedResults = JSON.parse(jsonResults) as JSONObject[];

    // Save query results as documents in Couchbase Lite
    const exports = database.getCollection("exports");

    for (const row of parsedResults) {
        const userData = row.users;  // Extract user data

        // Create and save as new document
        const exportDoc = exports.createDocument(null, {
            type: 'user_export',
            exportedAt: new Date().toISOString(),
            userData: userData
        });

        await exports.save(exportDoc);
    }

    console.log('Query results saved as documents');
// end::query-access-json[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::query-select-all-json[]
    // SELECT * returns results nested under collection name
    const allQuery = database.createQuery('SELECT * FROM users LIMIT 5');
    const allResults = await allQuery.execute();

    // Result format when using SELECT *:
    // [
    //   {
    //     "users": {
    //       "name": "Alice",
    //       "email": "alice@example.com",
    //       "role": "admin"
    //     }
    //   },
    //   ...
    // ]

    const jsonString = JSON.stringify(allResults[0], null, 2);
    console.log('SELECT * format:', jsonString);
// end::query-select-all-json[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::query-select-properties-json[]
    // SELECT specific properties returns flat results
    const propsQuery = database.createQuery(`
    SELECT name, email, role
    FROM users
    LIMIT 5
`);
    const propsResults = await propsQuery.execute();


    const jsonString = JSON.stringify(propsResults[0], null, 2);
    console.log('SELECT properties format:', jsonString);
// end::query-select-properties-json[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::document-to-json-export[]
    // Export document as JSON for backup or transfer
    const tasks = database.getCollection("tasks");
    const task = await tasks.getDocument(DocID("task-001"));

    if (task) {
    // Create JSON export with metadata
        const exportData = {
            _id: meta(task).id,
            _sequence: meta(task).sequence,
            data: { ...task }  // Spread operator to copy properties
        };

        const jsonExport = JSON.stringify(exportData, null, 2);

        // Download as file
        const blob = new Blob([jsonExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `task-${meta(task).id}.json`;
        a.click();
    }
// end::document-to-json-export[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::json-to-document[]
    // Import JSON data as document
    const jsonData = `{
        "title": "Imported Task",
        "description": "Task imported from JSON",
        "completed": false,
        "priority": 2
    }`;

    // Parse JSON and save as document
    const taskData = JSON.parse(jsonData) as CBLDictionary;
    const tasks = database.getCollection("tasks");
    const newDoc = tasks.createDocument(null, taskData);
    await tasks.save(newDoc);

    console.log('Imported document ID:', meta(newDoc).id);
    // end::json-to-document[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::document-serialization[]
    // Serialize document for API transmission
    const users = database.getCollection("users");
    const user = await users.getDocument(DocID("user-456"));

    if (user) {
    // Prepare for API
        const apiPayload = {
            id: meta(user).id,
            data: user 
        };

        // Send to server
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload)
        });

        if (response.ok) {
            console.log('User data sent to server');
        }
    }
// end::document-serialization[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::json-array-documents[]
    // Export multiple documents as JSON array
    const query = database.createQuery('SELECT tasks.*, meta().id as id FROM tasks WHERE completed = false');
    const results = await query.execute();

    // Serialize to JSON
    const jsonArray = JSON.stringify(results, null, 2);
    console.log('Documents array:', jsonArray);

    // Could save to file or send to API
    localStorage.setItem('pendingTasks', jsonArray);
// end::json-array-documents[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {events:{}}});

    // tag::json-with-dates[]
    // Handle dates when converting to/from JSON
    const events = database.getCollection("events");
    const event = await events.getDocument(DocID("event-001"));

    if (event) {
    // Dates are stored as ISO strings
        const jsonString = JSON.stringify(event);

        // When parsing back, convert date strings to Date objects
        const parsed = JSON.parse(jsonString, (_, value) => {
        // Check if value looks like an ISO date string
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                return new Date(value);
            }
            
            return value as unknown;
        }) as CBLDictionary;

        console.log('Event date:', parsed.startDate instanceof Date);
    }
// end::json-with-dates[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {users:{}}});

    // tag::json-circular-reference[]
    // Handle potential circular references
    const doc = await database.getCollection("users").getDocument(DocID("user-123"));
    if (doc) {
        try {
        // Standard JSON.stringify may fail with circular references
            JSON.stringify(doc);
        } catch (error) {
        // Use a custom replacer to handle circular references
            const seen = new WeakSet();
            const jsonString = JSON.stringify(doc, (_, value) => {
                if (typeof value === 'object' && value !== null) {
                    const key: WeakKey = value as object;
                    if (seen.has(key)) {
                        return '[Circular]';
                    }
                    seen.add(key);
                }

                return value as unknown;
            });
            console.log('JSON with circular handling:', jsonString);
        }
    }
    // end::json-circular-reference[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {config:{}}});

    // tag::json-type-preservation[]
    // Preserve data types when serializing
    const config = database.getCollection("config");
    const settings = await config.getDocument(DocID("app-settings"));

    if (settings) {
    // JSON serialization preserves:
    // - strings, numbers, booleans
    // - objects and arrays
    // - null values

        // But loses:
        // - undefined (becomes null or omitted)
        // - Date objects (become strings)
        // - functions (omitted)
        // - Map, Set, etc. (become empty objects)

        const jsonString = JSON.stringify(settings);
        const restored = JSON.parse(jsonString) as CBLDictionary;

        console.log('Original:', settings);
        console.log('Restored:', restored);
    }
    // end::json-type-preservation[]
}

{
// tag::datatype_dictionary[]
    interface TasksSchema {
        title: string;
        details: {
            location: string;
            duration: number;
            attendees: string[];
        };
        metadata: {
            createdBy: string;
            department: string;
            tags: string[];
        };
    };

    interface DBSchema {
        tasks: TasksSchema;
    }

    const config: DatabaseConfig<DBSchema> = {
        name: "mydb",
        version: 1,
        collections: {
            tasks: {}
        }
    };

    const database = await Database.open(config);
    const tasks = database.collections.tasks;

    // Create document with nested objects
    const doc = tasks.createDocument(null, {
        title: "Project Meeting",
        details: {
            location: "Conference Room A",
            duration: 60,
            attendees: ["Alice", "Bob", "Charlie"]
        },
        metadata: {
            createdBy: "admin",
            department: "Engineering",
            tags: ["important", "recurring"]
        }
    });

    await tasks.save(doc);

    // Access nested properties (note in TypeScript you should use a schema instead)
    const meeting = await tasks.getDocument(meta(doc).id);
    if (meeting) {
        console.log(`Location: ${meeting.details.location}`);
        console.log(`Duration: ${meeting.details.duration} minutes`);
        console.log(`Created by: ${meeting.metadata.createdBy}`);

        // Modify nested objects
        meeting.details.location = "Conference Room B";
        meeting.metadata.tags.push("urgent");
        await tasks.save(meeting);
    }
// end::datatype_dictionary[]
}

{
// tag::datatype_array[]
// Working with arrays

    interface ProjectsSchema {
        name: string;
        team: string[];
        milestones: string[];
        tags: string[];
    };

    interface DBSchema {
        projects: ProjectsSchema;
    }

    const config: DatabaseConfig<DBSchema> = {
        name: "mydb",
        version: 1,
        collections: {
            projects: {}
        }
    };

    const database = await Database.open(config);
    const projects = database.collections.projects;

    // Create document with arrays
    const project = projects.createDocument(null, {
        name: "Mobile App Development",
        team: ["Alice", "Bob", "Charlie"],
        milestones: [
            "Requirements gathering",
            "Design phase",
            "Development",
            "Testing",
            "Deployment"
        ],
        tags: ["mobile", "javascript", "react"]
    });

    await projects.save(project);

    // Access array elements
    const savedProject = await projects.getDocument(meta(project).id);
    if (savedProject) {
        console.log(`First team member: ${savedProject.team[0]}`);
        console.log(`Total milestones: ${savedProject.milestones.length}`);

        // Modify arrays
        savedProject.team.push("Diana");  // Add team member
        savedProject.milestones[2] = "Development (In Progress)";  // Update milestone
        savedProject.tags = savedProject.tags.filter((tag: string) => tag !== "mobile");  // Remove tag

        await projects.save(savedProject);
    }
// end::datatype_array[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::document-listener[]
    // Register for document change events
    const tasks = database.getCollection("tasks");
    const docId = DocID("task-001");

    // Add document change listener
    const token = tasks.addDocumentChangeListener(docId, (change) => {
        console.log(`Document ${change.id} changed`);
        console.log(`Revision: ${change.rev}`);
        console.log(`Sequence: ${change.sequence}`);

        if (change.deleted) {
            console.log('Document was deleted');
        } else {
            console.log('Document was updated');
        }
    });

    // Make changes to trigger the listener
    const doc = await tasks.getDocument(docId);
    if (doc) {
        doc.status = "completed";
        await tasks.save(doc);  // Listener will be called
    }

    // Remove listener when done
    token.remove();
// end::document-listener[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::document-expiration[]
    // Set document expiration
    const tasks = database.getCollection("tasks");
    const doc = await tasks.getDocument(DocID("task-001"));

    if (doc) {
    // Set expiration to 1 day from now (using milliseconds)
        const oneDayFromNow = 24 * 60 * 60 * 1000;  // 24 hours in milliseconds
        await tasks.setDocumentExpiration(doc, oneDayFromNow);

        console.log('Document will expire in 24 hours');

        // Or set expiration using Date object
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 1);  // 1 day from now
        await tasks.setDocumentExpiration(doc, expirationDate);

        // Get document expiration
        const expiration = await tasks.getDocumentExpiration(doc);
        if (expiration) {
            console.log(`Document expires on: ${expiration.toISOString()}`);
        }

        // Clear expiration
        await tasks.setDocumentExpiration(doc, undefined);
        console.log('Document expiration cleared');
    }
// end::document-expiration[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::document-expiration-by-id[]
    // Set expiration using document ID (without loading document)
    const tasks = database.getCollection("tasks");
    const docId = DocID("task-002");

    // Set expiration to 7 days from now
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    await tasks.setDocumentExpiration(docId, sevenDays);

    // Get expiration by document ID
    const expiration = await tasks.getDocumentExpiration(docId);
    if (expiration) {
        console.log(`Document ${docId} expires: ${expiration.toISOString()}`);
    } else {
        console.log(`Document ${docId} has no expiration`);
    }
// end::document-expiration-by-id[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::collection-change-listener[]
    // Register for all document changes in a collection
    const tasks = database.getCollection("tasks");

    const token = tasks.addChangeListener((changes) => {
        console.log(`${changes.entries.length} documents changed`);

        changes.forEach(change => {
            console.log(`Changed document: ${change.id}`);
        });

        // Update UI or perform other actions
        updateTaskList(changes);
    });

    // Make changes to trigger the listener
    const doc1 = tasks.createDocument(null, { title: "New Task 1" });
    await tasks.save(doc1);  // Listener will be called

    const doc2 = tasks.createDocument(null, { title: "New Task 2" });
    await tasks.save(doc2);  // Listener will be called

    // Remove listener when done
    token.remove();
// end::collection-change-listener[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: {tasks:{}}});

    // tag::document-expiration-date[]
    // Set expiration using specific date
    const tasks = database.getCollection("tasks");
    const doc = await tasks.getDocument(DocID("task-003"));

    if (doc) {
    // Set expiration to a specific date (e.g., end of year)
        const endOfYear = new Date('2025-12-31T23:59:59Z');
        await tasks.setDocumentExpiration(doc, endOfYear);

        console.log(`Document will expire on: ${endOfYear.toISOString()}`);

        // Check if document has expired
        const expiration = await tasks.getDocumentExpiration(doc);
        if (expiration) {
            const now = new Date();
            if (now > expiration) {
                console.log('Document has expired and will be purged');
            } else {
                const daysUntilExpiration = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`Document expires in ${daysUntilExpiration} days`);
            }
        }
    }
// end::document-expiration-date[]
}

// Helper function referenced in snippets
function updateTaskList(changes: CollectionChange) {
    console.log('Updating task list for documents:', changes);
}