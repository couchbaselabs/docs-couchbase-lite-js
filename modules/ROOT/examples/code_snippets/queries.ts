import type { Query, ListenerToken} from '@couchbase/lite-js';
import { Database, type JSONValue, type QueryAliases } from '@couchbase/lite-js';

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // Create a live query with change listener
    // tag::live-query[]
    interface TaskResult {
        title: string;
    }

    const query = database.createQuery(`
    SELECT title FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
`);

    // Add change listener - receives array of results
    const token = query.addChangeListener<TaskResult>((results) => {
        console.log(`Query results updated: ${results.length} tasks`);

        // Update UI with new results
        results.forEach(row => {
            const task = row as TaskResult;
            console.log(`Task: ${task.title}`);
        });

        // Update your application UI
        updateTaskList(results);
    });

    // The listener is now active and will be called whenever results change
    // end::live-query[]

    token.remove();
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::remove-listener[]
    const query = database.createQuery('SELECT * FROM tasks WHERE completed = false');
    const token = query.addChangeListener(_ => {
        console.log('Results updated');
    });

    // Later, remove the listener
    token.remove();
    console.log('Listener removed');
// end::remove-listener[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::multiple-listeners[]
    const query = database.createQuery('SELECT * FROM tasks WHERE priority >= 3');

    // Listener 1: Update UI
    const uiToken = query.addChangeListener(results => {
        updateTaskList(results);
    });

    // Listener 2: Log changes
    const logToken = query.addChangeListener(results => {
        console.log(`High priority tasks: ${results.length}`);
    });

    // Listener 3: Send analytics
    const analyticsToken = query.addChangeListener(results => {
        trackMetric('high_priority_tasks', results.length);
    });

    // Each listener receives independent notifications
    // Remove listeners individually when done
    uiToken.remove();
    logToken.remove();
    analyticsToken.remove();
// end::multiple-listeners[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::typescript-live-query[]
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

    // Add typed listener
    const token = query.addChangeListener<TaskResult>((results) => {
        results.forEach(t => {
            const task = t as TaskResult;
            const title: string = task.title;  // Type-safe
            const priority: number = task.priority;

            console.log(`${title} - Priority: ${priority}`);
        });
    });
// end::typescript-live-query[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::live-query-errors[]
    const query = database.createQuery('SELECT * FROM tasks');

    query.addChangeListener(results => {
        try {
        // Process results
            updateUI(results);
        } catch (error) {
            console.error('Error updating UI:', error);
        // Handle error without crashing the listener
        }
    });

    // Wrap listener registration in try-catch for setup errors
    try {
        query.addChangeListener(results => {
            processResults(results);
        });
    } catch (error) {
        console.error('Failed to create live query listener:', error);
    }
// end::live-query-errors[]
}

{
// tag::live-query-lifecycle[]
    class TaskManager {
        private query: Query | null = null;
        private database: Database | null = null;
        private listenerToken: ListenerToken | null = null;

        async start() {
            this.database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

            // Create query
            this.query = this.database.createQuery(`
            SELECT * FROM tasks
            WHERE assignedTo = $userId
            AND completed = false
        `);

            // Set parameters
            this.query.parameters = { userId: 'current-user' };

            // Start listening
            this.listenerToken = this.query.addChangeListener(results => {
                this.onResultsChanged(results);
            });

            console.log('Live query started');
        }

        onResultsChanged(results: QueryAliases[]) {
            console.log(`Tasks updated: ${results.length}`);
            this.updateUI(results);
        }

        updateParameters(userId: string) {
        // Changing parameters triggers listener with new results
            if (this.query) {
                this.query.parameters = { userId };
            }
        }

        stop() {
        // Clean up listener
            if (this.listenerToken) {
                this.listenerToken.remove();
                this.listenerToken = null;
                console.log('Live query stopped');
            }
        }

        private updateUI(_: QueryAliases[]) {
        // Update application UI
        }
    }

    // Usage
    const manager = new TaskManager();
    await manager.start();  // Start listening

    // Later: change parameters (triggers update)
    manager.updateParameters('different-user');

    // Clean up when component unmounts
    manager.stop();
// end::live-query-lifecycle[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::live-query-parameters[]
    const query = database.createQuery(`
    SELECT * FROM tasks
    WHERE status = $status
    AND priority >= $minPriority
    ORDER BY createdAt DESC
`);

    // Set initial parameters
    query.parameters = {
        status: 'active',
        minPriority: 2
    };

    // Add listener
    const token = query.addChangeListener(results => {
        console.log(`Found ${results.length} tasks`);
        updateTaskList(results);
    });

    // Changing parameters triggers the listener with new results
    query.parameters = {
        status: 'active',
        minPriority: 3  // Changed parameter
    };
    // Listener is automatically called with new filtered results
    // end::live-query-parameters[]
    token.remove();
}

import { useEffect, useState } from 'react';
{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::live-query-react[]

    // Import useEffect and useState from 'react'

    function TaskList(userId: string) {
        interface TaskDoc {
            id: string;
            title: string;
            [key: string]: JSONValue;
        }
        const [tasks, setTasks] = useState<TaskDoc[]>([]);

        useEffect(() => {
        // Create query
            const query = database.createQuery(`
            SELECT meta().id as id, title FROM tasks
            WHERE assignedTo = $userId
            AND completed = false
            ORDER BY createdAt DESC
        `);

            query.parameters = { userId };

            // Add listener
            const token = query.addChangeListener(results => {
            // Update React state when results change
                setTasks(results as TaskDoc[]);
            });

            // Cleanup on unmount
            return () => {
                token.remove();
            };
        }, [userId]);  // Re-create query when userId changes

        return (
            `<ul>
            {tasks.map(task => (
                <li key={task._id}>{task.title}</li>
            ))}
        </ul>`
        );
    }
// end::live-query-react[]
}

import { ref, onMounted, onUnmounted, watch } from 'vue';
{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-vue[]

    // Import ref, onMounted, onUnmounted, watch from 'vue'

    function useLiveQuery(queryString: string, params: Record<string, JSONValue>) {
        interface TaskDoc {
            id: string;
            title: string;
            [key: string]: JSONValue;
        }
        const results = ref<TaskDoc[]>([]);
        let token: ListenerToken | null = null;

        const setupQuery = () => {
        // Clean up previous listener
            if (token) {
                token.remove();
            }

            // Create new query
            const query = database.createQuery(queryString);
            query.parameters = params;

            // Add listener
            token = query.addChangeListener(newResults => {
                results.value = newResults as TaskDoc[];
            });
        };

        onMounted(() => {
            setupQuery();
        });

        onUnmounted(() => {
            if (token) {
                token.remove();
            }
        });

        // Re-setup query when parameters change
        watch(() => params, () => {
            setupQuery();
        }, { deep: true });

        return results;
    }

    // Usage in component
    useLiveQuery(
        'SELECT * FROM tasks WHERE completed = $completed',
        { completed: false }
    );
// end::live-query-vue[]
}


import { Component, type OnInit, type OnDestroy } from '@angular/core';

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-angular[]

    // Import Component, OnInit, OnDestroy from '@angular/core'

    @Component({
        selector: 'app-task-list',
        template: `
        <ul>
            <li *ngFor="let task of tasks">{{ task.title }}</li>
        </ul>
    `
    })

    class TaskListComponent implements OnInit, OnDestroy {
        tasks: JSONValue[] = [];
        private listenerToken: ListenerToken | null = null;

        ngOnInit() {
            const query = database.createQuery(`
            SELECT * FROM tasks
            WHERE completed = false
            ORDER BY createdAt DESC
        `);

            this.listenerToken = query.addChangeListener(results => {
            // Update component when results change
                this.tasks = results.map(row => row.tasks);
            });
        }

        ngOnDestroy() {
        // Clean up listener
            if (this.listenerToken) {
                this.listenerToken.remove();
            }
        }
    }
// end::live-query-angular[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-performance[]
    const query = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
`);

    // Debounce rapid updates to avoid UI thrashing
    let updateTimeout: NodeJS.Timeout;
    const token = query.addChangeListener(results => {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            updateUI(results);
        }, 100);  // Wait 100ms before updating UI
    });

    // Or use a flag to batch updates
    let isUpdating = false;
    const batchToken = query.addChangeListener(results => {
        if (isUpdating) return;

        isUpdating = true;
        requestAnimationFrame(() => {
            updateUI(results);
            isUpdating = false;
        });
    });
    // end::live-query-performance[]
    token.remove();
    batchToken.remove();
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-conditional[]
    class SmartQueryManager {
        private token: ListenerToken | null = null;
        private query: Query;

        constructor() {
            this.query = database.createQuery('SELECT * FROM tasks WHERE completed = false');
        }

        startListening() {
            if (!this.token) {
                this.token = this.query.addChangeListener(results => {
                    this.handleResults(results);
                });
                console.log('Started listening');
            }
        }

        stopListening() {
            if (this.token) {
                this.token.remove();
                this.token = null;
                console.log('Stopped listening');
            }
        }

        // Pause when app goes to background
        handleVisibilityChange() {
            if (document.hidden) {
                this.stopListening();
            } else {
                this.startListening();
            }
        }

        private handleResults(results: QueryAliases[]) {
            console.log('Results updated:', results.length);
        }
    }

    const manager = new SmartQueryManager();

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
        manager.handleVisibilityChange();
    });

    // Start initially if page is visible
    if (!document.hidden) {
        manager.startListening();
    }
// end::live-query-conditional[]
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-pagination[]
    const pageSize = 20;
    let currentPage = 0;

    const query = database.createQuery(`
    SELECT * FROM tasks
    WHERE completed = false
    ORDER BY createdAt DESC
    LIMIT $limit OFFSET $offset
`);

    function updatePage(page: number) {
        currentPage = page;
        query.parameters = {
            limit: pageSize,
            offset: page * pageSize
        };
    }

    // Add listener - will be called when parameters change
    const token = query.addChangeListener(results => {
        displayTasks(results, currentPage);
    });

    // Set initial page
    updatePage(0);

    // Navigate to next page (listener automatically updates)
    function nextPage() {
        updatePage(currentPage + 1);
    }

    // Navigate to previous page
    function previousPage() {
        updatePage(Math.max(0, currentPage - 1));
    }
    // end::live-query-pagination[]
    token.remove();
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-filter[]
    const searchQuery = database.createQuery(`
    SELECT * FROM tasks
    WHERE title LIKE $searchTerm
    OR description LIKE $searchTerm
    ORDER BY createdAt DESC
`);

    const token = searchQuery.addChangeListener(results => {
        displaySearchResults(results);
    });

    // Update search as user types
    function onSearchInput(searchText: string) {
        searchQuery.parameters = {
            searchTerm: `%${searchText}%`
        };
    // Listener automatically fires with filtered results
    }

    // Connect to search input
    const searchInput = document.querySelector<HTMLInputElement>('#search');
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            onSearchInput(searchInput.value);
        });
    }
    // end::live-query-filter[]
    token.remove();
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});

    // tag::live-query-aggregate[]
    interface StatsResult {
        total: number;
        completedCount: number;
        pendingCount: number;
        avgPriority: number;
    }

    const statsQuery = database.createQuery(`
    SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN completed THEN 1 ELSE 0 END) AS completedCount,
        SUM(CASE WHEN NOT completed THEN 1 ELSE 0 END) AS pendingCount,
        AVG(priority) AS avgPriority
    FROM tasks
`);

    const token = statsQuery.addChangeListener<StatsResult>(results => {
        if (results.length > 0) {
            const stats = results[0] as StatsResult;
            updateDashboard(stats);
        }
    });
    // end::live-query-aggregate[]

    function updateDashboard(stats: StatsResult) {
        console.log('Dashboard stats:', stats);
    }

    token.remove();
}

{
    const database = await Database.open({name: "mydb", version: 1, collections: { tasks: {} }});
    // tag::live-query-cleanup[]
    class LiveQueryComponent {
        private tokens: ListenerToken[] = [];

        setupQueries() {
        // Track all listener tokens
            const query1 = database.createQuery('SELECT * FROM tasks WHERE priority = 1');
            this.tokens.push(query1.addChangeListener(this.handleLowPriority));

            const query2 = database.createQuery('SELECT * FROM tasks WHERE priority >= 3');
            this.tokens.push(query2.addChangeListener(this.handleHighPriority));

            const query3 = database.createQuery('SELECT * FROM tasks WHERE completed = true');
            this.tokens.push(query3.addChangeListener(this.handleCompleted));
        }

        cleanup() {
        // Remove all listeners
            this.tokens.forEach(token => token.remove());
            this.tokens = [];
            console.log('All live query listeners removed');
        }

        private handleLowPriority = (results: QueryAliases[]) => {
            console.log('Low priority tasks:', results.length);
        };

        private handleHighPriority = (results: QueryAliases[]) => {
            console.log('High priority tasks:', results.length);
        };

        private handleCompleted = (results: QueryAliases[]) => {
            console.log('Completed tasks:', results.length);
        };
    }

    // Usage
    const component = new LiveQueryComponent();
    component.setupQueries();

    // Clean up when component is destroyed
    window.addEventListener('beforeunload', () => {
        component.cleanup();
    });
// end::live-query-cleanup[]
}

// Helper functions referenced in snippets
function updateTaskList(results: QueryAliases[]) {
    console.log('Task list updated with', results.length, 'tasks');
}

function trackMetric(metric: string, value: number) {
    console.log(`Metric: ${metric} = ${value}`);
}

function updateUI(results: QueryAliases[]) {
    console.log('Updating UI with results:', results.length);
}

function processResults(results: QueryAliases[]) {
    console.log('Processing results:', results.length);
}

function displayTasks(results: QueryAliases[], page: number) {
    console.log(`Displaying page ${page} with ${results.length} tasks`);
}

function displaySearchResults(results: QueryAliases[]) {
    console.log('Search results:', results.length);
}
