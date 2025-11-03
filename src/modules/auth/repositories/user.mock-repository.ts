import { Injectable } from '@nestjs/common';
import { User } from '../user.entity';

@Injectable()
export class UserMockRepository {
  private users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((u) => u.email === email);
    return Promise.resolve(user || null);
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    const user = this.users.find(
      (u) => u.provider === provider && u.providerId === providerId,
    );
    return Promise.resolve(user || null);
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = new User();
    user.id = this.generateId();
    user.email = userData.email || '';
    user.provider = userData.provider || null;
    user.providerId = userData.providerId || null;
    user.refreshToken = userData.refreshToken || null;
    user.createdAt = new Date();
    user.updatedAt = new Date();

    this.users.push(user);
    return Promise.resolve(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error(`User with id ${id} not found`);
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };

    return Promise.resolve(this.users[userIndex]);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find((u) => u.id === id);
    return Promise.resolve(user || null);
  }

  async clear(): Promise<void> {
    this.users = [];
    return Promise.resolve();
  }

  async findAll(): Promise<User[]> {
    return Promise.resolve(this.users);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
