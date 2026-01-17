import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TodoService } from '../../services/todo.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Task, TaskPriority } from '../../../../shared/models/task.model';
import { TodoFormComponent } from '../todo-form/todo-form.component';

@Component({
  selector: 'app-todo-item',
  templateUrl: './todo-item.component.html',
  styleUrls: ['./todo-item.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ]
})
export class TodoItemComponent implements OnInit, OnChanges {
  @Input() task!: Task;
  @Output() taskUpdated = new EventEmitter<void>();
  @Output() taskDeleted = new EventEmitter<void>();

  isLocked = false;
  canEdit = false;
  priorityColors: { [key: string]: string } = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336'
  };

  constructor(
    private todoService: TodoService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.updateLockStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['task']) {
      this.updateLockStatus();
    }
  }

  updateLockStatus(): void {
    this.isLocked = this.todoService.isTaskLocked(this.task);
    this.canEdit = this.todoService.canEditTask(this.task);
  }

  toggleComplete(): void {
    if (!this.canEdit) {
      this.snackBar.open('Task is locked by another user', 'Close', { duration: 3000 });
      return;
    }

    this.todoService.updateTask(this.task._id!, {
      completed: !this.task.completed
    }).subscribe({
      next: () => {
        this.taskUpdated.emit();
      }
    });
  }

  editTask(): void {
    if (!this.canEdit) {
      this.snackBar.open('Task is locked by another user', 'Close', { duration: 3000 });
      return;
    }

    // Lock the task before editing
    this.todoService.lockTask(this.task._id!).subscribe({
      next: () => {
        const dialogRef = this.dialog.open(TodoFormComponent, {
          width: '500px',
          data: { task: this.task }
        });

        dialogRef.afterClosed().subscribe((result: boolean | undefined) => {
          // Unlock the task after dialog closes
          this.todoService.unlockTask(this.task._id!).subscribe();
          if (result) {
            this.taskUpdated.emit();
          }
        });
      }
    });
  }

  deleteTask(): void {
    if (!this.canEdit) {
      this.snackBar.open('Task is locked by another user', 'Close', { duration: 3000 });
      return;
    }

    if (confirm('Are you sure you want to delete this task?')) {
      this.todoService.deleteTask(this.task._id!).subscribe({
        next: () => {
          this.taskDeleted.emit();
          this.snackBar.open('Task deleted successfully', 'Close', { duration: 3000 });
        }
      });
    }
  }

  getPriorityColor(): string {
    return this.priorityColors[this.task.priority] || this.priorityColors['medium'];
  }

  getPriorityLabel(): string {
    return this.task.priority.charAt(0).toUpperCase() + this.task.priority.slice(1);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString();
  }

  getUserName(user: any): string {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return 'User';
    return user.username || 'Unknown';
  }

  isOverdue(): boolean {
    if (!this.task.dueDate || this.task.completed) return false;
    const dueDate = new Date(this.task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  isDueSoon(): boolean {
    if (!this.task.dueDate || this.task.completed || this.isOverdue()) return false;
    const dueDate = new Date(this.task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return dueDate.getTime() === today.getTime() || dueDate.getTime() === tomorrow.getTime();
  }
}
