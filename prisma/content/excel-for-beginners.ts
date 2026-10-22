// "Microsoft Excel for Beginners": a complete course written for learners
// who have never used a spreadsheet. Examples use everyday Sierra Leone
// settings (a provision shop, a school, a savings group) and prices in
// new Leones (Le), as used since the 2022 redenomination. Installed by
// prisma/content/install.ts.

import type { CoursePack } from "./types";

export const excelForBeginners: CoursePack = {
  slug: "microsoft-excel-for-beginners",
  title: "Microsoft Excel for Beginners",
  description:
    "Start from zero and learn to use Excel with confidence: enter and format data, sort and filter lists, write your first formulas, make charts and print clean reports. Every lesson uses everyday examples, from shop sales to school marks, and ends with a short practice task.",
  category: "Digital Skills",
  level: "Beginner",
  durationMinutes: 360,
  skill: { name: "Microsoft Excel", category: "Digital Skills" },
  modules: [
    {
      title: "Getting to know Excel",
      lessons: [
        {
          title: "What Excel is and why it is useful",
          content: `Microsoft Excel is a spreadsheet program. A spreadsheet is a big grid where you can type words and numbers, and Excel can then add them up, sort them and turn them into charts for you.

People use Excel every day to:
- keep track of sales and stock in a shop
- record student marks and work out averages
- manage a budget for a family, a church or a savings group
- make lists of customers, members or suppliers

Where you can use Excel
- On a computer: Excel comes with Microsoft 365 or Office.
- In a web browser: Excel for the web is free with a Microsoft account at office.com.
- On a phone: the free Microsoft Excel app works on Android and iPhone.
The buttons may sit in slightly different places, but everything in this course works the same way on each of them.

Opening Excel
1. Open Excel and choose "Blank workbook".
2. You will see an empty grid. This is your first worksheet.

A file in Excel is called a workbook. One workbook can hold several worksheets (also called sheets), like pages in an exercise book. The tabs at the bottom of the window, such as "Sheet1", let you move between them.

Practice
Open a blank workbook and look around. Find the grid, the sheet tab at the bottom and the menu tabs across the top (Home, Insert, Formulas and others). You will learn what each part does in the next lesson.`,
        },
        {
          title: "The Excel window: cells, rows, columns and the ribbon",
          content: `Before you type anything, it helps to know the names of the parts of the Excel window.

Columns and rows
- Columns run from top to bottom and are named with letters: A, B, C and so on.
- Rows run from left to right and are numbered: 1, 2, 3 and so on.

Cells
A cell is one box in the grid, where a column and a row meet. Each cell has an address made of its column letter and row number. The cell in column B, row 4 is called B4. The cell you have clicked on is the active cell. It has a green border, and its address appears in the Name Box at the top left.

Ranges
A group of cells next to each other is called a range. You write a range with a colon between the first and last cell. A1:A10 means every cell from A1 down to A10. A1:C5 is a block three columns wide and five rows tall.

The ribbon
The ribbon is the band of buttons across the top. It is split into tabs:
- Home: fonts, colours, alignment and number formats
- Insert: charts, tables and pictures
- Formulas: ready-made functions
- Data: sorting and filtering
- View: zoom and freezing rows

The formula bar
Just above the grid is the formula bar. It shows exactly what is inside the active cell, which is very useful once you start writing formulas.

Practice
Click on cell D7. Check that the Name Box shows D7. Now click and drag from B2 to C6 to select the range B2:C6.`,
        },
        {
          title: "Entering and editing data",
          content: `Now you can start typing into cells.

Typing into a cell
1. Click a cell.
2. Type a word or a number.
3. Press Enter to move down, or Tab to move right.

Excel treats what you type in one of three ways:
- Text, like "Rice" or "Fatmata Kamara". Text lines up on the left of the cell.
- Numbers, like 250000. Numbers line up on the right of the cell.
- Dates, like 15/03/2026. Excel stores dates as numbers so it can sort them and count the days between them.

Editing a cell
- To replace what is in a cell, click it and simply type the new value.
- To change part of it, double-click the cell (or press F2) and edit inside it.
- To clear a cell, click it and press Delete.
- Made a mistake? Press Ctrl+Z to undo it.

Making columns wider
If text is cut off or a number shows as ####, the column is too narrow. Double-click the line between two column letters at the top, and Excel will fit the column to its contents.

AutoFill saves typing
The small square at the bottom right corner of the active cell is the fill handle. Drag it down to:
- copy the same value into the cells below
- continue a series, such as 1, 2, 3 or January, February, March or Mon, Tue, Wed

Practice
Start a shop list. In A1 type "Item", in B1 "Price (Le)" and in C1 "Quantity". Below them, add five items such as rice, palm oil, sugar, onions and soap, with a price and a quantity for each.`,
        },
        {
          title: "Saving, opening and keeping your work safe",
          content: `Saving often means you never lose your work if the power goes off or your phone runs out of battery.

Saving for the first time
1. Press Ctrl+S, or choose File and then Save As.
2. Choose where to save it: your computer, a USB drive or OneDrive.
3. Give the workbook a clear name, such as "Shop sales March 2026".
4. Click Save.

Excel workbooks end in .xlsx. After the first save, press Ctrl+S every few minutes to save your changes.

AutoSave
If you save to OneDrive, Excel can save your work automatically. Look for the AutoSave switch at the top left of the window. Excel for the web and the phone app save automatically.

Opening a workbook
Choose File and then Open, or double-click the file in your folders. Recent files are listed so you can find them quickly.

Good habits
- Use names that say what the file is and when it is from.
- Keep one folder for all your Excel work.
- Keep a second copy of important files on a USB drive or in OneDrive.
- Before big changes, use Save As to make a copy with a new name, such as "Budget v2".

Practice
Save your shop list as "My first workbook". Close Excel, then open the file again and check that your list is still there.`,
        },
      ],
      quiz: {
        title: "Module 1 check: Getting to know Excel",
        description: "Five questions on the Excel window and entering data.",
        questions: [
          {
            type: "SINGLE_CHOICE",
            prompt: "What is the address of the cell in column C, row 5?",
            options: ["5C", "C5", "C:5", "R5C"],
            correct: [1],
            explanation: "A cell address is the column letter followed by the row number, so column C, row 5 is C5.",
          },
          {
            type: "TRUE_FALSE",
            prompt: "One Excel workbook can contain several worksheets.",
            options: ["True", "False"],
            correct: [0],
            explanation: "A workbook is the file. It can hold many worksheets, shown as tabs at the bottom.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "Which range covers every cell from A1 down to A10?",
            options: ["A1-A10", "A1:A10", "A1;A10", "A1 to A10"],
            correct: [1],
            explanation: "Ranges are written with a colon between the first and last cell.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "A cell shows #### instead of a number. What is the most likely reason?",
            options: [
              "The number is wrong",
              "The column is too narrow to show the number",
              "The file is damaged",
              "The cell is locked",
            ],
            correct: [1],
            explanation: "#### means the column is too narrow. Double-click the column edge to widen it.",
          },
          {
            type: "MULTIPLE_CHOICE",
            prompt: "Which of these can the fill handle do when you drag it? Select all that apply.",
            options: [
              "Continue a series such as January, February, March",
              "Copy a value into the cells below",
              "Save the workbook",
              "Continue a number series such as 1, 2, 3",
            ],
            correct: [0, 1, 3],
            explanation: "The fill handle copies values and continues series. It does not save the file.",
          },
        ],
      },
    },
    {
      title: "Formatting and organising data",
      lessons: [
        {
          title: "Making your sheet easy to read",
          content: `Formatting changes how your data looks without changing the values. A well-formatted sheet is easier to read and looks professional.

Text formatting (Home tab)
- Bold (Ctrl+B) for headings
- Font size and font colour
- Fill colour to shade a cell's background
- Borders to draw lines around cells

Alignment
- Left, centre or right align the contents of a cell.
- Wrap Text lets long text run onto several lines inside one cell.
- Avoid Merge & Center inside data tables, because merged cells make sorting and filtering difficult. Use it only for a title above the table.

Number formats
Choose a format from the Number group on the Home tab:
- Number: choose how many decimal places to show
- Comma style: adds thousands separators, so 1500000 shows as 1,500,000
- Percentage: shows 0.25 as 25%
- Date: shows dates as 15/03/2026 or 15-Mar-2026
To show prices in Leones (Le), choose More Number Formats, then Custom, and type "Le" #,##0 so 2500 shows as Le 2,500.

Format Painter
To copy the look of one cell to others, click the cell, click Format Painter (the paintbrush), then click or drag over the cells to format.

Practice
In your shop list, make the headings bold with a light fill colour, add borders to the table and give the price column comma style.`,
        },
        {
          title: "Sorting and filtering lists",
          content: `Once you have a list, Excel can put it in order and show only the rows you need.

Set your list up well first
- One header row at the top, with a short name for each column
- One record (one item, one person, one sale) per row
- No completely blank rows or columns in the middle of the list

Sorting
1. Click any cell in the column you want to sort by.
2. On the Data tab, click A to Z (smallest to largest) or Z to A (largest to smallest).
Excel keeps each row together, so a price always stays with its item. Do not select just one column before sorting, or the rows can become mixed up.

For more control, click Sort on the Data tab. You can then sort by more than one column, for example by Class and then by Name.

Filtering
1. Click any cell in your list.
2. On the Data tab, click Filter. Small arrows appear in the header row.
3. Click an arrow and tick only the values you want to see.
Rows that do not match are hidden, not deleted. To show everything again, click Clear on the Data tab.

Number filters let you ask questions such as "show sales greater than Le 1,000", and text filters let you find names that contain a word.

Freeze Panes
In a long list the headings scroll out of view. On the View tab, choose Freeze Panes and then Freeze Top Row to keep the header row on screen.

Practice
Sort your shop list by price from largest to smallest. Then turn on the filter and show only items with a quantity greater than 10.`,
        },
        {
          title: "Working with rows, columns and sheets",
          content: `As your workbook grows, you will need to reorganise it.

Rows and columns
- Insert: right-click a row number or column letter and choose Insert.
- Delete: right-click and choose Delete. This removes the whole row or column.
- Hide: right-click and choose Hide. Use Unhide to bring it back.
- Resize: drag the line between two row numbers or column letters.

Moving and copying
- Copy with Ctrl+C, cut with Ctrl+X and paste with Ctrl+V.
- To move cells, select them, point at the green border until the cursor shows four arrows, then drag.
- Paste Special (right-click, then Paste Special) lets you paste only the values or only the formatting.

Worksheets
- Add a sheet: click the plus (+) button next to the sheet tabs.
- Rename: double-click a tab and type a name, such as "January".
- Move: drag a tab left or right.
- Copy: hold Ctrl while you drag a tab. This is handy when every month uses the same layout.
- Colour: right-click a tab and choose Tab Color.

Tables
Select your list and press Ctrl+T to turn it into an Excel table. Tables add a filter to every column, shade every other row, and grow automatically when you add new rows at the bottom.

Practice
Rename Sheet1 to "Stock". Copy the sheet and rename the copy "April". Turn your list into a table with Ctrl+T.`,
        },
      ],
      quiz: {
        title: "Module 2 check: Formatting and organising data",
        description: "Five questions on formatting, sorting and filtering.",
        questions: [
          {
            type: "SINGLE_CHOICE",
            prompt: "Which number format shows 1500000 as 1,500,000?",
            options: ["Percentage", "Comma style", "Date", "Text"],
            correct: [1],
            explanation: "Comma style adds thousands separators.",
          },
          {
            type: "TRUE_FALSE",
            prompt: "Filtering a list deletes the rows that do not match.",
            options: ["True", "False"],
            correct: [1],
            explanation: "Filtering only hides rows. Clear the filter and they come back.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "You want the header row to stay visible while you scroll down a long list. What do you use?",
            options: ["Wrap Text", "Merge & Center", "Freeze Top Row", "Format Painter"],
            correct: [2],
            explanation: "View, then Freeze Panes, then Freeze Top Row keeps the headings on screen.",
          },
          {
            type: "MULTIPLE_CHOICE",
            prompt: "Which of these help keep a list easy to sort and filter? Select all that apply.",
            options: [
              "One header row",
              "One record per row",
              "Blank rows in the middle of the list",
              "Merged cells inside the table",
            ],
            correct: [0, 1],
            explanation: "Blank rows and merged cells break sorting and filtering. One header row and one record per row keep lists clean.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "Which shortcut turns a list into an Excel table?",
            options: ["Ctrl+B", "Ctrl+S", "Ctrl+T", "Ctrl+Z"],
            correct: [2],
            explanation: "Ctrl+T creates a table. Ctrl+B is bold, Ctrl+S saves and Ctrl+Z undoes.",
          },
        ],
      },
    },
    {
      title: "Formulas and functions",
      lessons: [
        {
          title: "Your first formulas",
          content: `Formulas are what make Excel powerful. A formula calculates an answer for you, and updates it whenever the numbers change.

Every formula starts with an equals sign (=)
Click a cell, type =, then the calculation, and press Enter. For example =5+3 shows 8.

The basic operators
- + add
- - subtract
- * multiply
- / divide
- ^ power (for example =3^2 gives 9)

Use cell addresses, not numbers
The real power comes from pointing at cells. If B2 holds the price and C2 holds the quantity, then in D2 type:
=B2*C2
This gives the total for that item. If you change the price in B2, the total in D2 updates straight away.

Order of calculation
Excel multiplies and divides before it adds and subtracts, just like in maths class. Use brackets to control the order:
- =2+3*4 gives 14
- =(2+3)*4 gives 20

Copying formulas
Write the formula once in D2, then drag the fill handle down. Excel changes the row numbers for you, so D3 becomes =B3*C3, D4 becomes =B4*C4, and so on.

Seeing the formula
The cell shows the answer, but the formula bar shows the formula. Click a cell to check how its answer was worked out.

Practice
In your shop list, add a heading "Total (Le)" in D1. In D2 type =B2*C2 and fill it down to every item.`,
        },
        {
          title: "SUM, AVERAGE, MIN, MAX and COUNT",
          content: `A function is a ready-made formula with a name. You give it a range of cells and it does the work.

The five functions every beginner should know
- =SUM(D2:D20) adds up all the numbers in D2 to D20
- =AVERAGE(D2:D20) gives the average (mean)
- =MIN(D2:D20) finds the smallest number
- =MAX(D2:D20) finds the largest number
- =COUNT(D2:D20) counts how many cells contain numbers

How to write a function
1. Click the cell where you want the answer.
2. Type = and the function name, for example =SUM(
3. Select the range with your mouse, or type it, for example D2:D20.
4. Type the closing bracket ) and press Enter.

The AutoSum shortcut
Click the cell just below a column of numbers and press Alt+= (or click AutoSum on the Home tab). Excel guesses the range and writes the SUM for you. Check the range it chose, then press Enter.

COUNT and COUNTA
COUNT only counts numbers. To count cells that contain anything, including names, use =COUNTA(A2:A20). This is useful for counting how many students or customers are on a list.

Example: class marks
If a teacher has marks for 40 students in C2:C41:
- Class total: =SUM(C2:C41)
- Average mark: =AVERAGE(C2:C41)
- Top mark: =MAX(C2:C41)
- Lowest mark: =MIN(C2:C41)

Practice
Below your shop list, work out the total value of all items with SUM, and the most expensive price with MAX.`,
        },
        {
          title: "Relative and absolute references",
          content: `When you copy a formula, Excel changes its cell addresses. Usually that is exactly what you want, but sometimes it is not.

Relative references (the normal kind)
A reference like B2 is relative. If you copy =B2*C2 one row down, it becomes =B3*C3. The formula keeps the same pattern, just one row lower.

When relative references go wrong
Say cell F1 holds a tax rate of 15%, and you want the tax on every total in column D. In E2 you type =D2*F1. When you fill it down, E3 becomes =D3*F2, but F2 is empty, so the answer is 0. You needed every row to keep pointing at F1.

Absolute references
Put a dollar sign before the column letter and the row number to lock a reference: $F$1. Now it never changes when you copy the formula.
In E2 type =D2*$F$1 and fill it down. Every row now multiplies its own total by the same rate in F1.

The F4 shortcut
While typing or editing a formula, click on a reference and press F4. Excel adds the dollar signs for you. Press F4 again to cycle through the options:
- $F$1 locks both the column and the row
- F$1 locks only the row
- $F1 locks only the column
- F1 locks nothing

When to use an absolute reference
Whenever many formulas need to use one fixed value, such as a tax rate, an exchange rate, a discount or a target, store that value in its own cell and lock the reference to it.

Practice
In F1 type a discount of 10%. In E2 write a formula that works out the discount on the total in D2, using $F$1, then fill it down.`,
        },
        {
          title: "Making decisions with IF",
          content: `The IF function lets Excel choose between two answers, depending on whether something is true.

How IF is written
=IF(test, value if true, value if false)

Example: pass or fail
If a mark is in B2 and the pass mark is 50:
=IF(B2>=50, "Pass", "Fail")
Students with 50 or more show "Pass", and everyone else shows "Fail". Put text answers inside double quotes.

Comparison signs you can use in the test
- = equal to
- <> not equal to
- > greater than
- < less than
- >= greater than or equal to
- <= less than or equal to

Example: reorder stock
If the quantity in stock is in C2:
=IF(C2<5, "Reorder", "OK")
Now you can see at a glance which items are running low.

Example: calculating with IF
IF can also return a calculation. To give a 5% bonus to sales staff who sold more than Le 20,000:
=IF(B2>20000, B2*5%, 0)

Counting and adding with conditions
Two useful relatives of IF:
- =COUNTIF(C2:C41, "Pass") counts how many cells say "Pass"
- =SUMIF(A2:A50, "Rice", D2:D50) adds up the totals in column D only for rows where column A says "Rice"

Common mistakes
- Forgetting the quotes around text answers
- Mixing up > and <
- A missing bracket at the end

Practice
In your shop list, add a column "Stock check" with =IF(C2<5, "Reorder", "OK") and fill it down.`,
        },
      ],
      quiz: {
        title: "Module 3 check: Formulas and functions",
        description: "Five questions on formulas, functions and IF.",
        questions: [
          {
            type: "SINGLE_CHOICE",
            prompt: "Which symbol must every Excel formula begin with?",
            options: ["+", "=", "#", "@"],
            correct: [1],
            explanation: "Every formula starts with an equals sign.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "What does =(2+3)*4 give?",
            options: ["14", "20", "24", "9"],
            correct: [1],
            explanation: "The brackets are worked out first: 2+3 is 5, and 5 times 4 is 20.",
          },
          {
            type: "SHORT_ANSWER",
            prompt: "Which function adds up all the numbers in a range? Type only its name.",
            options: ["SUM", "=SUM", "SUM()"],
            correct: [0, 1, 2],
            explanation: "SUM adds the numbers in a range, for example =SUM(D2:D20).",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "You copy =D2*$F$1 down one row. What does it become?",
            options: ["=D3*$F$2", "=D3*$F$1", "=D2*$F$1", "=D3*F2"],
            correct: [1],
            explanation: "D2 is relative so it becomes D3. $F$1 is absolute so it stays the same.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "A mark is in B2. Which formula shows Pass for 50 or more and Fail otherwise?",
            options: [
              '=IF(B2>50, "Pass", "Fail")',
              '=IF(B2>=50, "Pass", "Fail")',
              '=IF(B2<=50, "Pass", "Fail")',
              "=IF(B2>=50, Pass, Fail)",
            ],
            correct: [1],
            explanation: ">= includes exactly 50, and text answers must be inside double quotes.",
          },
        ],
      },
    },
    {
      title: "Charts, printing and sharing",
      lessons: [
        {
          title: "Turning numbers into charts",
          content: `A chart shows your numbers as a picture, so patterns jump out. It is often the clearest way to share results with a manager, a teacher or a group.

Making a chart
1. Select the data, including the headings. For example, select the item names and their totals.
2. On the Insert tab, choose a chart type, or click Recommended Charts and let Excel suggest one.
3. The chart appears on your sheet. Drag it to move it, and drag its corners to resize it.

Choosing the right chart
- Column or bar chart: comparing amounts, such as sales of each item
- Line chart: showing change over time, such as sales each month
- Pie chart: showing parts of a whole, such as how a budget is split. Use it only with a few categories.

Making the chart clear
Click the chart and use the buttons beside it, or the Chart Design tab:
- Chart Title: give it a title that says what it shows, such as "Sales by item, March 2026"
- Axis Titles: label the axes, for example "Amount (Le)"
- Data Labels: show the exact number on each bar or slice
- Chart Styles: change the colours and look

Charts update themselves
A chart stays linked to its data. If you change a number in the sheet, the chart changes too.

Practice
Select the item names and totals in your shop list and insert a column chart. Give it a clear title and add data labels.`,
        },
        {
          title: "Printing and sharing your work",
          content: `A sheet that looks fine on screen can print across many untidy pages. A few settings fix that.

Preview first
Press Ctrl+P (or choose File and then Print). The preview on the right shows exactly what will print. Always check it before printing.

Page setup
In the print screen or on the Page Layout tab you can:
- Orientation: choose Landscape for wide tables
- Scaling: choose "Fit All Columns on One Page" so no columns spill onto another page
- Margins: make them narrower to fit more on the page
- Print Area: select just the cells you want, then choose Page Layout, Print Area, Set Print Area

Headers and titles
- Add a header or footer with the page number and date (Insert, Header & Footer).
- For long lists, use Page Layout, Print Titles, and set "Rows to repeat at top" so the header row prints on every page.

Saving as PDF
A PDF looks the same on every phone and computer, and nobody can change your numbers by mistake. Choose File, Save As, and pick PDF as the file type. This is the best way to send a report by email or WhatsApp.

Sharing the workbook itself
- Attach the .xlsx file to an email so others can edit it.
- If the file is in OneDrive, click Share to send a link. You can choose whether people can edit it or only view it.

Practice
Set your shop list to landscape, fit all columns on one page, add a page number in the footer and save a copy as a PDF.`,
        },
      ],
      quiz: {
        title: "Module 4 check: Charts, printing and sharing",
        description: "Five questions on charts and getting your work out of Excel.",
        questions: [
          {
            type: "SINGLE_CHOICE",
            prompt: "Which chart is best for showing how sales changed month by month?",
            options: ["Pie chart", "Line chart", "No chart", "A picture"],
            correct: [1],
            explanation: "Line charts show change over time.",
          },
          {
            type: "TRUE_FALSE",
            prompt: "If you change a number in the data, the chart made from it updates automatically.",
            options: ["True", "False"],
            correct: [0],
            explanation: "Charts stay linked to their data.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "Your table is too wide and prints onto two pages. What should you try first?",
            options: [
              "Delete some columns",
              "Landscape orientation and Fit All Columns on One Page",
              "Make the font bigger",
              "Print it twice",
            ],
            correct: [1],
            explanation: "Landscape plus fitting all columns on one page keeps a wide table on a single page width.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "What is the best format for sending a finished report that others should not change?",
            options: [".xlsx", "PDF", "A screenshot of the formula bar", "A blank workbook"],
            correct: [1],
            explanation: "A PDF looks the same everywhere and cannot easily be edited.",
          },
          {
            type: "SINGLE_CHOICE",
            prompt: "Which shortcut opens the print preview?",
            options: ["Ctrl+P", "Ctrl+T", "Ctrl+C", "Alt+="],
            correct: [0],
            explanation: "Ctrl+P opens the print screen with a preview.",
          },
        ],
      },
    },
  ],
  finalQuiz: {
    title: "Final quiz: Microsoft Excel for Beginners",
    description: "Ten questions covering the whole course. You have 20 minutes, and you need 70% to pass.",
    timeLimitMinutes: 20,
    questions: [
      {
        type: "SINGLE_CHOICE",
        prompt: "What is an Excel file called?",
        options: ["A worksheet", "A workbook", "A cell", "A ribbon"],
        correct: [1],
        explanation: "The file is a workbook, and it contains one or more worksheets.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: "How many cells are in the range A1:B3?",
        options: ["3", "5", "6", "9"],
        correct: [2],
        explanation: "Two columns (A and B) times three rows (1 to 3) is six cells.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: "B2 holds a price and C2 holds a quantity. Which formula gives the total?",
        options: ["=B2+C2", "=B2*C2", "B2*C2", "=SUM(B2)"],
        correct: [1],
        explanation: "Price times quantity, and the formula must start with =.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: "Which function finds the largest number in a range?",
        options: ["=MIN()", "=MAX()", "=COUNT()", "=AVERAGE()"],
        correct: [1],
        explanation: "MAX returns the largest value. MIN returns the smallest.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: "Which formula counts the cells in A2:A30 that contain names?",
        options: ["=COUNT(A2:A30)", "=COUNTA(A2:A30)", "=SUM(A2:A30)", "=MAX(A2:A30)"],
        correct: [1],
        explanation: "COUNT only counts numbers. COUNTA counts any cell that is not empty.",
      },
      {
        type: "TRUE_FALSE",
        prompt: "$F$1 stays the same when you copy a formula to another cell.",
        options: ["True", "False"],
        correct: [0],
        explanation: "The dollar signs make it an absolute reference.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: 'What does =IF(C2<5, "Reorder", "OK") show when C2 is 8?',
        options: ["Reorder", "OK", "8", "An error"],
        correct: [1],
        explanation: "8 is not less than 5, so the test is false and IF shows the second answer, OK.",
      },
      {
        type: "MULTIPLE_CHOICE",
        prompt: "Which of these are safe ways to keep your work from being lost? Select all that apply.",
        options: [
          "Press Ctrl+S often",
          "Save to OneDrive with AutoSave on",
          "Keep a second copy on a USB drive",
          "Never save until you have finished",
        ],
        correct: [0, 1, 2],
        explanation: "Saving often and keeping a backup protect your work. Waiting until the end risks losing everything.",
      },
      {
        type: "SINGLE_CHOICE",
        prompt: "Which chart is best for comparing the sales of five different items?",
        options: ["Column chart", "Line chart", "Pie chart with 50 slices", "No chart is possible"],
        correct: [0],
        explanation: "Column and bar charts are the clearest way to compare amounts.",
      },
      {
        type: "SHORT_ANSWER",
        prompt: "Which key do you press while editing a formula to add the $ signs to a reference?",
        options: ["F4", "F 4"],
        correct: [0, 1],
        explanation: "F4 cycles a reference through $F$1, F$1, $F1 and F1.",
      },
    ],
  },
  project: {
    title: "Build a monthly shop sales tracker",
    instructions: `Put everything from this course together by building a sales tracker for a small provision shop.

1. Create a new workbook and name the first sheet "Sales".
2. Add these headings in row 1: Date, Item, Price (Le), Quantity, Total (Le).
3. Enter at least 15 sales from one month, using at least 5 different items. Use realistic prices in new Leones (Le).
4. In the Total column, write a formula that multiplies Price by Quantity, and fill it down.
5. Below the list, use functions to show: the total sales for the month (SUM), the average sale (AVERAGE), the biggest single sale (MAX) and the number of sales (COUNT).
6. Add a column "Big sale?" that uses IF to show "Yes" when the total is Le 1,000 or more, and "No" otherwise.
7. Format the sheet: bold headings, borders, comma style for money and a date format for the Date column. Freeze the top row.
8. Make a column chart of the sales total for each item. Give it a clear title. (Tip: use SUMIF to work out the total per item first.)
9. Set the page to landscape, fit all columns on one page, and save a copy as a PDF.

What to submit
Upload your workbook to OneDrive or Google Drive, set the link so anyone with it can view, and paste the link below. In the notes box, write two or three sentences about what your tracker shows about the month's sales.`,
    rubric: `Pass (all of these are needed):
- At least 15 sales with all five headings, entered one sale per row
- A working Total formula in every row (Price times Quantity), not typed-in numbers
- Correct SUM, AVERAGE, MAX and COUNT results below the list
- An IF formula in the "Big sale?" column that shows Yes for totals of Le 1,000 or more
- Clear formatting: bold headings, borders, money in comma style, top row frozen
- A titled chart showing totals by item
- A one-page landscape PDF copy

Excellent work also:
- uses SUMIF to work out each item's total for the chart
- uses an absolute reference for the Le 1,000 threshold, stored in its own cell
- writes a short, accurate summary of what the numbers show`,
  },
};
