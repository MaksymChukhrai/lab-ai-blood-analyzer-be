import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LinkedInOAuthGuard extends AuthGuard('linkedin') {}
