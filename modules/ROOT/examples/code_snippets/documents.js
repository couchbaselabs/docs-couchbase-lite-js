// tag::tojson-document[]
// Get a document from the collection
const users = database.getCollection("users");
const doc = await users.getDocument("user-123");

if (doc) {
    // Convert document to JSON string
    const jsonString = JSON.stringify(doc);
    console.log('Document as JSON:', jsonString);

    // Parse JSON string back to object
    const parsedDoc = JSON.parse(jsonString);
    console.log('Parsed document:', parsedDoc);

    // You can also stringify with formatting
    const prettyJson = JSON.stringify(doc, null, 2);
    console.log('Pretty JSON:\n', prettyJson);
}
// end::tojson-document[]

// tag::query-access-json[]
// Execute a query
const query = database.createQuery(`
    SELECT * FROM users
    WHERE role = 'admin'
`);

const results = await query.execute();

// Convert results to JSON string
const jsonResults = JSON.stringify(results, null, 2);
console.log('Query results as JSON:', jsonResults);

// Parse JSON back to object
const parsedResults = JSON.parse(jsonResults);

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

// tag::document-to-json-export[]
// Export document as JSON for backup or transfer
const tasks = database.getCollection("tasks");
const task = await tasks.getDocument("task-001");

if (task) {
    // Create JSON export with metadata
    const exportData = {
        _id: task._id,
        _sequence: task._sequence,
        data: { ...task }  // Spread operator to copy properties
    };

    const jsonExport = JSON.stringify(exportData, null, 2);

    // Download as file
    const blob = new Blob([jsonExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-${task._id}.json`;
    a.click();
}
// end::document-to-json-export[]

// tag::json-to-document[]
// Import JSON data as document
const jsonData = `{
    "title": "Imported Task",
    "description": "Task imported from JSON",
    "completed": false,
    "priority": 2
}`;

// Parse JSON and save as document
const taskData = JSON.parse(jsonData);
const tasks = database.getCollection("tasks");
const newDoc = tasks.createDocument(null, taskData);
await tasks.save(newDoc);

console.log('Imported document ID:', newDoc._id);
// end::json-to-document[]

// tag::document-serialization[]
// Serialize document for API transmission
const users = database.getCollection("users");
const user = await users.getDocument("user-456");

if (user) {
    // Prepare for API
    const apiPayload = {
        id: user._id,
        data: JSON.parse(JSON.stringify(user))  // Deep copy
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

// tag::json-array-documents[]
// Export multiple documents as JSON array
const tasks = database.getCollection("tasks");
const query = database.createQuery('SELECT * FROM tasks WHERE completed = false');
const results = await query.execute();

// Convert to array of documents
const documentsArray = results.map(row => ({
    id: row.tasks._id,
    ...row.tasks
}));

// Serialize to JSON
const jsonArray = JSON.stringify(documentsArray, null, 2);
console.log('Documents array:', jsonArray);

// Could save to file or send to API
localStorage.setItem('pendingTasks', jsonArray);
// end::json-array-documents[]

// tag::json-with-dates[]
// Handle dates when converting to/from JSON
const events = database.getCollection("events");
const event = await events.getDocument("event-001");

if (event) {
    // Dates are stored as ISO strings
    const jsonString = JSON.stringify(event);

    // When parsing back, convert date strings to Date objects
    const parsed = JSON.parse(jsonString, (key, value) => {
        // Check if value looks like an ISO date string
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            return new Date(value);
        }
        return value;
    });

    console.log('Event date:', parsed.startDate instanceof Date);
}
// end::json-with-dates[]

// tag::json-circular-reference[]
// Handle potential circular references
const doc = await database.getCollection("users").getDocument("user-123");

if (doc) {
    try {
        // Standard JSON.stringify may fail with circular references
        const jsonString = JSON.stringify(doc);
    } catch (error) {
        // Use a custom replacer to handle circular references
        const seen = new WeakSet();
        const jsonString = JSON.stringify(doc, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        });
        console.log('JSON with circular handling:', jsonString);
    }
}
// end::json-circular-reference[]

// tag::json-type-preservation[]
// Preserve data types when serializing
const config = database.getCollection("config");
const settings = await config.getDocument("app-settings");

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
    const restored = JSON.parse(jsonString);

    console.log('Original:', settings);
    console.log('Restored:', restored);
}
// end::json-type-preservation[]


// tag::datatype_dictionary[]
// Working with dictionaries (JavaScript objects)
const tasks = database.getCollection("tasks");

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

// Access nested properties
const meeting = await tasks.getDocument(doc._id);
console.log(`Location: ${meeting.details.location}`);
console.log(`Duration: ${meeting.details.duration} minutes`);
console.log(`Created by: ${meeting.metadata.createdBy}`);

// Modify nested objects
meeting.details.location = "Conference Room B";
meeting.metadata.tags.push("urgent");
await tasks.save(meeting);
// end::datatype_dictionary[]

// tag::datatype_array[]
// Working with arrays
const projects = database.getCollection("projects");

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
const savedProject = await projects.getDocument(project._id);
console.log(`First team member: ${savedProject.team[0]}`);
console.log(`Total milestones: ${savedProject.milestones.length}`);

// Modify arrays
savedProject.team.push("Diana");  // Add team member
savedProject.milestones[2] = "Development (In Progress)";  // Update milestone
savedProject.tags = savedProject.tags.filter(tag => tag !== "mobile");  // Remove tag

await projects.save(savedProject);
// end::datatype_array[]

// tag::document-listener[]
// Register for document change events
const tasks = database.getCollection("tasks");
const docId = "task-001";

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

// tag::document-expiration[]
// Set document expiration
const tasks = database.getCollection("tasks");
const doc = await tasks.getDocument("task-001");

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

// tag::document-expiration-by-id[]
// Set expiration using document ID (without loading document)
const tasks = database.getCollection("tasks");
const docId = "task-002";

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

// tag::collection-change-listener[]
// Register for all document changes in a collection
const tasks = database.getCollection("tasks");

const token = tasks.addChangeListener((changes) => {
    console.log(`${changes.documentIDs.length} documents changed`);

    changes.documentIDs.forEach(docId => {
        console.log(`Changed document: ${docId}`);
    });

    // Update UI or perform other actions
    updateTaskList(changes.documentIDs);
});

// Make changes to trigger the listener
const doc1 = tasks.createDocument(null, { title: "New Task 1" });
await tasks.save(doc1);  // Listener will be called

const doc2 = tasks.createDocument(null, { title: "New Task 2" });
await tasks.save(doc2);  // Listener will be called

// Remove listener when done
token.remove();
// end::collection-change-listener[]

// tag::document-expiration-date[]
// Set expiration using specific date
const tasks = database.getCollection("tasks");
const doc = await tasks.getDocument("task-003");

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

// Helper function referenced in snippets
function updateTaskList(docIds: string[]) {
    console.log('Updating task list for documents:', docIds);
}