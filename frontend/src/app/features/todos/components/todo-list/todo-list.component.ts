import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { TodoService } from '../../services/todo.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Task } from '../../../../shared/models/task.model';
import { TodoFormComponent } from '../todo-form/todo-form.component';
import { TodoItemComponent } from '../todo-item/todo-item.component';

@Component({
  selector: 'app-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    TodoItemComponent
  ]
})
export class TodoListComponent implements OnInit, OnDestroy {
  @ViewChildren(TodoItemComponent) todoItems!: QueryList<TodoItemComponent>;
  tasks: Task[] = [];
  isLoading = false;
  private subscriptions = new Subscription();

  constructor(
    private todoService: TodoService,
    private websocketService: WebSocketService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Connect WebSocket
    this.websocketService.connect();

    // Load tasks
    this.loadTasks();

    // Subscribe to real-time updates
    this.subscriptions.add(
      this.todoService.tasks$.subscribe(tasks => {
        this.tasks = tasks;
        console.log('Tasks updated');
        this.cdr.detectChanges();
        
        // Update lock status for all items when tasks change
        if (this.todoItems) {
          this.todoItems.forEach(item => item.updateLockStatus());
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadTasks(): void {
    this.isLoading = true;
    this.todoService.loadTasks().subscribe({
      next: () => {
        this.isLoading = false;
        console.log('Tasks loaded');
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(
          error.error?.message || 'Failed to load tasks',
          'Close',
          { duration: 5000 }
        );
      }
    });
  }

  openAddTaskDialog(): void {
    const dialogRef = this.dialog.open(TodoFormComponent, {
      width: '500px',
      data: { task: null }
    });

    dialogRef.afterClosed().subscribe((result: boolean | undefined) => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  get allTasks(): Task[] {
    return this.tasks;
  }

  get completedTasks(): Task[] {
    return this.tasks.filter(task => task.completed);
  }

  get pendingTasks(): Task[] {
    return this.tasks.filter(task => !task.completed);
  }
}
