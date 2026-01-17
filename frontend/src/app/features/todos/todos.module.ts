import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TodoListComponent } from './components/todo-list/todo-list.component';
import { TodoItemComponent } from './components/todo-item/todo-item.component';
import { TodoFormComponent } from './components/todo-form/todo-form.component';

const routes: Routes = [
  { path: '', component: TodoListComponent }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatDialogModule,
    MatDatepickerModule,
    MatSelectModule,
    MatNativeDateModule,
    MatChipsModule,
    MatSnackBarModule,
    MatTooltipModule,
    TodoListComponent,
    TodoItemComponent,
    TodoFormComponent
  ]
})
export class TodosModule { }
