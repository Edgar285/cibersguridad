import { Component } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [ToolbarModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {

}
