import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  public id: string;

  @ApiProperty({ example: 'user@example.com' })
  public email: string;

  @ApiProperty({
    example: 'John',
    required: false,
  })
  public firstName?: string;

  @ApiProperty({
    example: 'Doe',
    required: false,
  })
  public lastName?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  public picture?: string;

  @ApiProperty({
    example: 'google',
    enum: ['magic_link', 'google', 'linkedin'],
  })
  public provider: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  public createdAt: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.picture = user.picture;
    this.provider = user.provider;
    this.createdAt = user.createdAt;
  }
}
