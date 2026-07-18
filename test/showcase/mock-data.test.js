import { activity, customers, renderMockData } from '../../examples/showcase/src/mock-data';

describe('showcase parody portfolio', () => {
  test('keeps the Turbshire client names and promotional motion positions visible', () => {
    expect(customers.map(client => client.name)).toEqual(expect.arrayContaining([
      'Marley Chunger',
      'Melon Husk',
      'Barf Jazzos'
    ]));
    expect(customers.some(client => client.plan.includes('Sproing'))).toBe(true);
    expect(activity.some(item => item.title.includes('Zero Gravity'))).toBe(true);
  });

  test('renders the portfolio as interactive motion rows', () => {
    document.body.innerHTML = '<table><tbody data-customer-rows></tbody></table><ul data-activity-list></ul>';
    renderMockData(document);

    const rows = Array.from(document.querySelectorAll('[data-customer-rows] tr'));
    expect(rows).toHaveLength(customers.length);
    expect(rows[0].dataset.customer).toBe('Marley Chunger');
    expect(rows.every(row => row.hasAttribute('data-motion-item'))).toBe(true);
    expect(document.querySelector('[data-activity-list]').textContent).toContain('Boron');
  });
});
