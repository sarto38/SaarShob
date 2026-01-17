import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { TodoService } from '../../services/todo.service';
import { Task, TaskPriority, CreateTaskDto, UpdateTaskDto } from '../../../../shared/models/task.model';

@Component({
  selector: 'app-todo-form',
  templateUrl: './todo-form.component.html',
  styleUrls: ['./todo-form.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule
  ]
})
export class TodoFormComponent implements OnInit {
  taskForm: FormGroup;
  isEditMode = false;
  taskPriorities = [
    { value: TaskPriority.LOW, label: 'Low' },
    { value: TaskPriority.MEDIUM, label: 'Medium' },
    { value: TaskPriority.HIGH, label: 'High' }
  ];

  constructor(
    private fb: FormBuilder,
    private todoService: TodoService,
    private dialogRef: MatDialogRef<TodoFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { task: Task | null }
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      priority: [TaskPriority.MEDIUM, Validators.required],
      dueDate: [null]
    });
  }

  ngOnInit(): void {
    if (this.data?.task) {
      this.isEditMode = true;
      this.taskForm.patchValue({
        title: this.data.task.title,
        description: this.data.task.description || '',
        priority: this.data.task.priority,
        dueDate: this.data.task.dueDate ? new Date(this.data.task.dueDate) : null
      });
    }
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const baseData = {
        description: formValue.description || undefined,
        priority: formValue.priority,
        dueDate: formValue.dueDate ? formValue.dueDate.toISOString() : undefined
      };

      if (this.isEditMode && this.data.task) {
        const updateData: UpdateTaskDto = {
          ...baseData,
          title: formValue.title
        };
        this.todoService.updateTask(this.data.task._id!, updateData).subscribe({
          next: () => {
            this.snackBar.open('Task updated successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.snackBar.open(
              error.error?.message || 'Failed to update task',
              'Close',
              { duration: 5000 }
            );
          }
        });
      } else {
        const createData: CreateTaskDto = {
          ...baseData,
          title: formValue.title
        };
        this.todoService.createTask(createData).subscribe({
          next: () => {
            this.snackBar.open('Task created successfully', 'Close', { duration: 3000 });
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.snackBar.open(
              error.error?.message || 'Failed to create task',
              'Close',
              { duration: 5000 }
            );
          }
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
