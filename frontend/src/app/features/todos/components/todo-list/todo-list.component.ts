import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, finalize } from 'rxjs';
import { map } from 'rxjs/operators';
import { TodoService } from '../../services/todo.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Task, TaskPriority } from '../../../../shared/models/task.model';
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
  isAddingTask = false;
  private subscriptions = new Subscription();

  private priorityWeights: Record<string, number> = {
    [TaskPriority.HIGH]: 3,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 1
  };

  constructor(
    private todoService: TodoService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load tasks
    this.loadTasks();

    // Subscribe to real-time updates
    this.subscriptions.add(
      this.todoService.tasks$.pipe(
        map(tasks => this.sortTasks(tasks))
      ).subscribe(tasks => {
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

  private sortTasks(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
      const weightA = this.priorityWeights[a.priority] || 0;
      const weightB = this.priorityWeights[b.priority] || 0;
      
      if (weightA !== weightB) {
        return weightB - weightA; // High priority first
      }
      
      // Secondary sort by dueDate (earlier due dates first), then by createdAt (newest first)
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      if (dueA !== dueB) {
        return dueA - dueB; // Due soonest first (nulls last)
      }
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdB - createdA; // Newest created first
    });
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
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openAddTaskDialog(): void {
    this.isAddingTask = true;
    const dialogRef = this.dialog.open(TodoFormComponent, {
      width: '500px',
      data: { task: null }
    });

    dialogRef.afterClosed().pipe(
      finalize(() => {
        this.isAddingTask = false;
        this.cdr.detectChanges();
      })
    ).subscribe((result: boolean | undefined) => {
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
