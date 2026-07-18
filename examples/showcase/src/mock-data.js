export const customers = Object.freeze([
  { name: 'Marley Chunger', contact: 'Chungerbook Social', plan: 'Long Sproing', usage: 82, status: 'Bullish', revenue: '$14,240' },
  { name: 'Melon Husk', contact: 'Spacely Motors', plan: 'Zero Gravity', usage: 64, status: 'Volatile', revenue: '$8,910' },
  { name: 'Barf Jazzos', contact: 'Amazing Web Services', plan: 'Waterfall Fund', usage: 91, status: 'Bullish', revenue: '$12,480' },
  { name: 'Tim Applebee', contact: 'Pear Computing', plan: 'Quiet Capital', usage: 38, status: 'Hodl', revenue: '$4,260' },
  { name: 'Jensen Huangry', contact: 'Nevidia Chips & Dip', plan: 'Wild Growth', usage: 73, status: 'At risk', revenue: '$7,840' }
]);

export const activity = Object.freeze([
  { initials: 'MC', tone: 'lime', title: 'Marley went long on Sproing', detail: '12 minutes ago', badge: '+18%' },
  { initials: 'MH', tone: 'blue', title: 'Melon acquired Zero Gravity', detail: '47 minutes ago', badge: 'Moon' },
  { initials: 'BJ', tone: 'coral', title: 'Barf diversified into Waterfall', detail: '2 hours ago', badge: 'Drip' },
  { initials: 'BW', tone: 'violet', title: 'Boron published a very long letter', detail: 'Yesterday', badge: '47 pp.' }
]);

function textCell(value, className = '') {
  const cell = document.createElement('td');
  cell.className = className;
  cell.textContent = value;
  return cell;
}

export function renderMockData(root = document) {
  const tableBody = root.querySelector('[data-customer-rows]');
  const activityList = root.querySelector('[data-activity-list]');

  if (tableBody) {
    tableBody.replaceChildren(...customers.map((customer, index) => {
      const row = document.createElement('tr');
      row.dataset.motionItem = '';
      row.dataset.customer = customer.name;

      const customerCell = document.createElement('td');
      const identity = document.createElement('span');
      identity.className = 'customer-identity';
      const mark = document.createElement('span');
      mark.className = `customer-mark tone-${index % 4}`;
      mark.textContent = customer.name.slice(0, 2).toUpperCase();
      const copy = document.createElement('span');
      copy.innerHTML = `<strong>${customer.name}</strong><small>${customer.contact}</small>`;
      identity.append(mark, copy);
      customerCell.append(identity);

      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = `status status-${customer.status.toLowerCase().replaceAll(' ', '-')}`;
      status.textContent = customer.status;
      statusCell.append(status);

      const usageCell = document.createElement('td');
      const usage = document.createElement('span');
      usage.className = 'usage-meter';
      usage.setAttribute('aria-label', `${customer.usage}% usage`);
      const fill = document.createElement('span');
      fill.style.width = `${customer.usage}%`;
      usage.append(fill);
      usageCell.append(usage, document.createTextNode(` ${customer.usage}%`));

      row.append(
        customerCell,
        textCell(customer.plan),
        usageCell,
        statusCell,
        textCell(customer.revenue, 'numeric')
      );
      return row;
    }));
  }

  if (activityList) {
    activityList.replaceChildren(...activity.map(item => {
      const entry = document.createElement('li');
      entry.dataset.motionItem = '';
      entry.innerHTML = `
        <span class="activity-avatar tone-${item.tone}">${item.initials}</span>
        <span class="activity-copy"><strong>${item.title}</strong><small>${item.detail}</small></span>
        <span class="activity-badge">${item.badge}</span>
      `;
      return entry;
    }));
  }
}
