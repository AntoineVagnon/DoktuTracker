/**
 * Mock Storage and Database implementation for integration tests
 * Provides in-memory storage that mimics real database operations without external connections
 */

import { nanoid } from 'nanoid';

/**
 * In-memory database tables
 */
class MockDatabase {
  constructor() {
    this.tables = {
      users: new Map(),
      membershipSubscriptions: new Map(),
      membershipCycles: new Map(),
      membershipAllowanceEvents: new Map(),
      appointmentCoverage: new Map(),
      appointments: new Map(),
      doctors: new Map(),
      timeSlots: new Map()
    };
  }

  reset() {
    for (const table of Object.values(this.tables)) {
      table.clear();
    }
  }

  // Mock Drizzle ORM query builder methods
  select() {
    return {
      from: (table) => ({
        where: (condition) => ({
          limit: (limit) => {
            const tableName = this.getTableName(table);
            const records = Array.from(this.tables[tableName].values());
            
            // Apply basic filtering (mock implementation)
            const filtered = this.applyMockFilter(records, condition);
            
            return Promise.resolve(filtered.slice(0, limit));
          },
          orderBy: (orderBy) => ({
            limit: (limit) => {
              const tableName = this.getTableName(table);
              const records = Array.from(this.tables[tableName].values());
              
              // Apply basic filtering (mock implementation)
              const filtered = this.applyMockFilter(records, condition);
              
              // Mock ordering (just return as-is for simplicity)
              return Promise.resolve(filtered.slice(0, limit));
            }
          })
        }),
        limit: (limit) => {
          const tableName = this.getTableName(table);
          const records = Array.from(this.tables[tableName].values());
          return Promise.resolve(records.slice(0, limit));
        }
      })
    };
  }

  insert(table) {
    return {
      values: (data) => ({
        returning: () => {
          const tableName = this.getTableName(table);
          const id = data.id || nanoid();
          const record = { 
            ...data, 
            id,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          this.tables[tableName].set(id, record);
          return Promise.resolve([record]);
        }
      })
    };
  }

  update(table) {
    return {
      set: (updates) => ({
        where: (condition) => ({
          returning: () => {
            const tableName = this.getTableName(table);
            const records = Array.from(this.tables[tableName].values());
            const filtered = this.applyMockFilter(records, condition);
            
            const updated = [];
            for (const record of filtered) {
              const updatedRecord = { 
                ...record, 
                ...updates, 
                updatedAt: new Date() 
              };
              this.tables[tableName].set(record.id, updatedRecord);
              updated.push(updatedRecord);
            }
            
            return Promise.resolve(updated);
          }
        })
      })
    };
  }

  delete(table) {
    return {
      where: (condition) => {
        const tableName = this.getTableName(table);
        const records = Array.from(this.tables[tableName].values());
        const filtered = this.applyMockFilter(records, condition);
        
        for (const record of filtered) {
          this.tables[tableName].delete(record.id);
        }
        
        return Promise.resolve();
      }
    };
  }

  // Helper methods
  getTableName(tableRef) {
    // Extract table name from table reference
    // In real Drizzle, this would be more complex, but for mocking we can use a simple mapping
    if (tableRef._.name) return tableRef._.name;
    if (tableRef.name) return tableRef.name;
    
    // Fallback - try to match common patterns
    const tableMap = {
      'users': 'users',
      'membershipSubscriptions': 'membershipSubscriptions',
      'membershipCycles': 'membershipCycles', 
      'membershipAllowanceEvents': 'membershipAllowanceEvents',
      'appointmentCoverage': 'appointmentCoverage'
    };
    
    return tableMap[Object.keys(tableMap).find(key => 
      tableRef.toString().includes(key)
    )] || 'users';
  }

  applyMockFilter(records, condition) {
    // Simple mock implementation - in real tests this would be more sophisticated
    // For now, just return all records since the tests will handle specific filtering
    return records;
  }

  // Direct table access for tests
  getTable(tableName) {
    return this.tables[tableName];
  }

  addRecord(tableName, record) {
    const id = record.id || nanoid();
    const fullRecord = { 
      ...record, 
      id,
      createdAt: record.createdAt || new Date(),
      updatedAt: record.updatedAt || new Date()
    };
    this.tables[tableName].set(id, fullRecord);
    return fullRecord;
  }

  getRecord(tableName, id) {
    return this.tables[tableName].get(id);
  }

  updateRecord(tableName, id, updates) {
    const existing = this.tables[tableName].get(id);
    if (existing) {
      const updated = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.tables[tableName].set(id, updated);
      return updated;
    }
    return null;
  }

  deleteRecord(tableName, id) {
    return this.tables[tableName].delete(id);
  }

  findRecords(tableName, filter = () => true) {
    return Array.from(this.tables[tableName].values()).filter(filter);
  }
}

/**
 * Mock Storage implementation that mimics the real storage interface
 */
export class MockStorage {
  constructor() {
    this.data = {
      users: new Map(),
      subscriptions: new Map(),
      cycles: new Map(),
      events: new Map(),
      coverage: new Map()
    };
  }

  reset() {
    for (const store of Object.values(this.data)) {
      store.clear();
    }
  }

  // User operations
  async getUser(id) {
    return this.data.users.get(parseInt(id)) || this.data.users.get(id);
  }

  async createUser(userData) {
    const id = userData.id || Date.now(); // Simple ID generation
    const user = {
      id,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.users.set(id, user);
    return user;
  }

  async updateUser(id, updates) {
    const numericId = parseInt(id);
    const existingUser = this.data.users.get(numericId) || this.data.users.get(id);
    if (existingUser) {
      const updated = {
        ...existingUser,
        ...updates,
        updatedAt: new Date()
      };
      this.data.users.set(existingUser.id, updated);
      return updated;
    }
    throw new Error(`User ${id} not found`);
  }

  async getUserByEmail(email) {
    for (const user of this.data.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  // Subscription operations (for membership tests)
  async createSubscription(subscriptionData) {
    const id = subscriptionData.id || nanoid();
    const subscription = {
      id,
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.subscriptions.set(id, subscription);
    return subscription;
  }

  async getSubscription(id) {
    return this.data.subscriptions.get(id);
  }

  async updateSubscription(id, updates) {
    const existing = this.data.subscriptions.get(id);
    if (existing) {
      const updated = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.data.subscriptions.set(id, updated);
      return updated;
    }
    return null;
  }

  // Cycle operations
  async createCycle(cycleData) {
    const id = cycleData.id || nanoid();
    const cycle = {
      id,
      ...cycleData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.cycles.set(id, cycle);
    return cycle;
  }

  async getCycle(id) {
    return this.data.cycles.get(id);
  }

  async updateCycle(id, updates) {
    const existing = this.data.cycles.get(id);
    if (existing) {
      const updated = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.data.cycles.set(id, updated);
      return updated;
    }
    return null;
  }

  async findActiveCycle(subscriptionId) {
    for (const cycle of this.data.cycles.values()) {
      if (cycle.subscriptionId === subscriptionId && cycle.isActive) {
        return cycle;
      }
    }
    return null;
  }

  // Coverage operations
  async createCoverage(coverageData) {
    const id = coverageData.id || nanoid();
    const coverage = {
      id,
      ...coverageData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.data.coverage.set(id, coverage);
    return coverage;
  }

  async findCoverageByAppointment(appointmentId) {
    for (const coverage of this.data.coverage.values()) {
      if (coverage.appointmentId === appointmentId) {
        return coverage;
      }
    }
    return null;
  }

  async updateCoverage(id, updates) {
    const existing = this.data.coverage.get(id);
    if (existing) {
      const updated = { 
        ...existing, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.data.coverage.set(id, updated);
      return updated;
    }
    return null;
  }

  // Event operations
  async createEvent(eventData) {
    const id = eventData.id || nanoid();
    const event = {
      id,
      ...eventData,
      timestamp: eventData.timestamp || new Date(),
      createdAt: new Date()
    };
    this.data.events.set(id, event);
    return event;
  }

  async getEventsByCycle(cycleId) {
    const events = [];
    for (const event of this.data.events.values()) {
      if (event.cycleId === cycleId) {
        events.push(event);
      }
    }
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Cleanup operations
  async deleteUser(id) {
    const numericId = parseInt(id);
    this.data.users.delete(numericId);
    this.data.users.delete(id);
  }

  async deleteSubscription(id) {
    this.data.subscriptions.delete(id);
  }

  async deleteCycle(id) {
    this.data.cycles.delete(id);
  }

  async deleteEvent(id) {
    this.data.events.delete(id);
  }

  async deleteCoverage(id) {
    this.data.coverage.delete(id);
  }

  // Find subscription by patient ID
  findSubscriptionByPatient(patientId) {
    for (const subscription of this.data.subscriptions.values()) {
      if (subscription.patientId === patientId) {
        return subscription;
      }
    }
    return null;
  }

  // Utility methods for test setup
  addUser(userData) {
    const id = userData.id || Date.now();
    const user = { id, ...userData };
    this.data.users.set(id, user);
    return user;
  }

  addSubscription(subscriptionData) {
    const id = subscriptionData.id || nanoid();
    const subscription = { id, ...subscriptionData };
    this.data.subscriptions.set(id, subscription);
    return subscription;
  }

  addCycle(cycleData) {
    const id = cycleData.id || nanoid();
    const cycle = { id, ...cycleData };
    this.data.cycles.set(id, cycle);
    return cycle;
  }

  // Debug helpers
  getAllUsers() {
    return Array.from(this.data.users.values());
  }

  getAllSubscriptions() {
    return Array.from(this.data.subscriptions.values());
  }

  getAllCycles() {
    return Array.from(this.data.cycles.values());
  }

  getAllEvents() {
    return Array.from(this.data.events.values());
  }

  getAllCoverage() {
    return Array.from(this.data.coverage.values());
  }
}

// Create singleton instances for tests
export const mockDb = new MockDatabase();
export const mockStorage = new MockStorage();

// Helper function to reset all mock data
export function resetMockData() {
  mockDb.reset();
  mockStorage.reset();
}

// Mock query operators (eq, and, etc.) for compatibility
export const mockEq = (field, value) => ({ field, operator: 'eq', value });
export const mockAnd = (...conditions) => ({ operator: 'and', conditions });
export const mockDesc = (field) => ({ field, direction: 'desc' });

export default {
  mockDb,
  mockStorage,
  resetMockData,
  MockStorage,
  MockDatabase
};