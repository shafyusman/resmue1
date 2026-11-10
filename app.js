const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const TYPES = [
 {id:"restaurant",name:"Restaurant / Cafe",icon:"🍽️",desc:"Tables, menu, orders"},
 {id:"hospital",name:"Hospital / Clinic",icon:"🏥",desc:"Patients, appointments"},
 {id:"grocery",name:"Grocery store",icon:"🥬",desc:"Products, stock, checkout"},
 {id:"shop",name:"Retail shop",icon:"🏬",desc:"Sales, inventory, customers"}
];
const MENUS = [
 ["WORKSPACE",[["dashboard","▦","Overview"]]],
 ["OPERATIONS",[["pos","▣","Point of sale"],["products","◇","Products & services"],["inventory","▤","Inventory"]]],
 ["DIRECTORY",[["people","♙","Customers & suppliers"]]],
 ["FINANCE",[["sales","▧","Sales & invoices"],["expenses","↘","Expenses"],["reports","⌁","Reports & profit"]]],
 ["BUSINESS TOOLS",[["special","✳","Business tools"]]],
 ["PREFERENCES",[["settings","⚙","Settings"]]]
];
let selectedType="grocery", db=null, cart=[];
let specialMode="";

function toast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function money(n){return `${db?.settings?.currency||"PKR"} ${Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2})}`}
async function api(url,options={}){const r=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const body=await r.json();if(!r.ok)throw new Error(body.error||"Request failed");return body}
function businessChoiceUI(){
 $("#businessChoices").innerHTML=TYPES.map(t=>`<button class="business-choice ${selectedType===t.id?"selected":""}" data-type="${t.id}"><span class="emoji">${t.icon}</span><b>${t.name}</b><div class="muted" style="font-size:9px;margin-top:5px">${t.desc}</div></button>`).join("");
 $$(".business-choice").forEach(b=>b.onclick=()=>{selectedType=b.dataset.type;businessChoiceUI()});
}
async function init(){
 businessChoiceUI();
 try{
  db=await api("/api/data");
  if(db.settings.businessType&&db.settings.businessName){launchApp()}
 }catch(e){toast("Cannot connect to local API. Start the server first.");}
 $("#startBtn").onclick=async()=>{
  const name=$("#businessName").value.trim();if(!name){toast("Enter a business name");return}
  try{await api("/api/settings",{method:"PUT",body:JSON.stringify({businessType:selectedType,businessName:name,ownerName:$("#ownerName").value.trim(),currency:$("#currency").value})});db=await api("/api/data");launchApp()}
  catch(e){toast(e.message)}
 };
}
function launchApp(){
 $("#onboarding").classList.add("hidden");$("#app").classList.remove("hidden");
 $("#workspaceName").textContent=db.settings.businessName;$("#workspaceType").textContent=db.settings.businessType.toUpperCase();
 $("#userAvatar").textContent=(db.settings.ownerName||db.settings.businessName).charAt(0).toUpperCase();
 $("#greetingName").textContent=db.settings.ownerName?`, ${escapeHtml(db.settings.ownerName)}`:"";
 $("#dateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
 buildNavigation();bindGlobal();renderAll();configureSpecial();
}
function buildNavigation(){
 $("#navigation").innerHTML=MENUS.map(([section,items])=>`<div class="nav-section">${section}</div>`+items.map(([id,icon,label])=>`<button class="nav-link ${id==="dashboard"?"active":""}" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("")).join("");
 $$(".nav-link[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
}
function go(page){
 $$(".page").forEach(p=>p.classList.remove("active"));$("#page-"+page).classList.add("active");
 $$(".nav-link[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 const titles={dashboard:"Overview",pos:"Point of sale",products:"Products & services",inventory:"Inventory",people:"Directory",sales:"Sales & invoices",expenses:"Expenses",reports:"Reports & profit",special:"Business tools",settings:"Settings"};
 $("#pageTitle").textContent=titles[page]||page;$("#sidebar").classList.remove("open");
 if(page==="special")configureSpecial();
}
function bindGlobal(){
 $$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
 $("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
 $("#switchBusiness").onclick=async()=>{if(!confirm("Return to business setup? Existing records will remain saved."))return;$("#app").classList.add("hidden");$("#onboarding").classList.remove("hidden");};
 $("#addProduct").onclick=()=>productDialog();
 $("#addPurchase").onclick=()=>purchaseDialog();
 $("#addPerson").onclick=()=>personDialog();
 $("#addExpense").onclick=()=>expenseDialog();
 $("#clearCart").onclick=()=>{cart=[];renderCart()};
 $("#discount").oninput=renderCart;
 $("#posSearch").oninput=renderCatalog;$("#posCategory").onchange=renderCatalog;
 $("#productSearch").oninput=renderProducts;$("#productFilter").onchange=renderProducts;
 $("#peopleType").onchange=renderPeople;$("#peopleSearch").oninput=renderPeople;
 $("#completeSale").onclick=completeSale;
 $("#exportSales").onclick=exportSales;
 $("#saveSettings").onclick=saveSettings;
 $("#backupBtn").onclick=backup;
 $("#resetBtn").onclick=resetWorkspace;
 $("#specialAdd").onclick=addSpecial;
}
function configureSpecial(){
 const type=db.settings.businessType;
 const configs={
 restaurant:{heading:"Restaurant operations",desc:"Manage dining tables and kitchen order references.",notice:"Demo module: table and order tracking only. Connect a kitchen display and payment terminal separately.",fields:["Table / order name","Status","Notes"],heads:["TABLE / ORDER","STATUS","NOTES","CREATED"],placeholder:"Table 01"},
 hospital:{heading:"Clinic & appointment desk",desc:"Keep a basic appointment schedule and patient reference list.",notice:"Privacy warning: use fictional demo records only. This is not a medical record system and is not suitable for real patient or clinical data.",fields:["Patient reference (no sensitive details)","Appointment date","Department / reason label","Status"],heads:["PATIENT REF","DATE","DEPARTMENT","STATUS"],placeholder:"PAT-001"},
 grocery:{heading:"Grocery operations",desc:"Monitor grocery categories, stock and purchase intake.",notice:"Use products and inventory to manage grocery items, expiry tracking is not included in this starter.",fields:["Supplier / purchase reference","Notes"],heads:["REFERENCE","NOTES","DATE"],placeholder:"Supplier invoice"},
 shop:{heading:"Retail shop operations",desc:"Track service notes, exchanges and store activity.",notice:"This starter provides basic retail POS and inventory. Advanced returns and loyalty points can be added later.",fields:["Activity title","Notes"],heads:["ACTIVITY","NOTES","DATE"],placeholder:"Exchange note"}
 };
 const c=configs[type]||configs.shop;
 $("#specialHeading").textContent=c.heading;$("#specialDescription").textContent=c.desc;$("#specialNotice").textContent=c.notice;
 $("#specialEyebrow").textContent=type==="hospital"?"CLINIC DESK":"BUSINESS TOOLS";
 if(type==="hospital"){
  $("#specialStats").innerHTML=`<article class="stat"><div class="stat-label">Appointment records</div><strong>${db.appointments.length}</strong></article><article class="stat"><div class="stat-label">Patient references</div><strong>${db.patients.length}</strong></article><article class="stat"><div class="stat-label">Today's date</div><strong style="font-size:15px">${new Date().toLocaleDateString()}</strong></article>`;
  $("#specialHead").innerHTML="<tr>"+c.heads.map(x=>`<th>${x}</th>`).join("")+"</tr>";
  $("#specialTable").innerHTML=db.appointments.map(x=>`<tr><td>${escapeHtml(x.patientRef)}</td><td>${escapeHtml(x.date)}</td><td>${escapeHtml(x.department)}</td><td>${escapeHtml(x.status)}</td></tr>`).join("")||emptyRow(4);
 }else{
  const records=type==="restaurant"?db.tables:type==="grocery"?db.purchases:db.expenses;
  $("#specialStats").innerHTML=`<article class="stat"><div class="stat-label">Activity records</div><strong>${records.length}</strong></article><article class="stat"><div class="stat-label">Products</div><strong>${db.products.length}</strong></article><article class="stat"><div class="stat-label">Sales</div><strong>${db.sales.length}</strong></article>`;
  $("#specialHead").innerHTML="<tr>"+c.heads.map(x=>`<th>${x}</th>`).join("")+"</tr>";
  $("#specialTable").innerHTML=records.slice(0,30).map(x=>type==="restaurant"?`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.status)}</td><td>${escapeHtml(x.notes)}</td><td>${new Date(x.createdAt).toLocaleDateString()}</td></tr>`:type==="grocery"?`<tr><td>${escapeHtml(x.supplier)}</td><td>${escapeHtml(x.product)} · ${x.qty} units</td><td>${new Date(x.createdAt).toLocaleDateString()}</td></tr>`:`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.category)}</td><td>${new Date(x.createdAt).toLocaleDateString()}</td></tr>`).join("")||emptyRow(c.heads.length);
 }
}
function addSpecial(){
 const type=db.settings.businessType;
 if(type==="hospital"){
  showDialog("Add appointment",[
   field("Patient reference","patientRef","text","e.g. PAT-001"),
   field("Appointment date","date","date"),
   field("Department / reason label","department","text","e.g. General clinic"),
   selectField("Status","status",["Scheduled","Checked in","Completed","Cancelled"])
  ],async v=>{await api("/api/appointments",{method:"POST",body:JSON.stringify({patientRef:v.patientRef,date:v.date,department:v.department,status:v.status})});await refresh();configureSpecial();toast("Appointment reference saved")});
 }else if(type==="restaurant"){
  showDialog("Add table / order reference",[field("Table or order name","name","text","Table 01"),selectField("Status","status",["Available","Occupied","Reserved","Cleaning"]),field("Notes","notes","text","Optional note")],async v=>{await api("/api/tables",{method:"POST",body:JSON.stringify(v)});await refresh();configureSpecial();toast("Table record added")});
 }else{
  go(type==="grocery"?"inventory":"expenses");
 }
}
function field(label,name,type="text",placeholder=""){return `<label>${label}<input name="${name}" type="${type}" placeholder="${placeholder}" ${type==="number"?'min="0"':''}></label>`}
function selectField(label,name,options){return `<label>${label}<select name="${name}">${options.map(x=>`<option>${x}</option>`).join("")}</select></label>`}
function showDialog(title,html,onSave){
 $("#dialogTitle").textContent=title;$("#dialogFields").innerHTML=html;
 const dialog=$("#recordDialog");dialog.showModal();
 $("#recordForm").onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(e.target).entries());try{await onSave(v);dialog.close()}catch(err){toast(err.message)}};
}
function productDialog(){
 showDialog("Add product or service",[
  field("Name","name","text","Product name"),
  field("SKU / barcode","sku","text","Optional unique code"),
  selectField("Category","category",db.categories),
  field("Selling price","price","number","0"),
  field("Cost price","cost","number","0"),
  field("Stock quantity","stock","number","0"),
  field("Minimum stock","minStock","number","5")
 ].join(""),async v=>{
  if(!v.name.trim()||Number(v.price)<0)throw Error("Enter a valid name and price");
  await api("/api/products",{method:"POST",body:JSON.stringify({...v,price:Number(v.price),cost:Number(v.cost||0),stock:Number(v.stock||0),minStock:Number(v.minStock||0),sku:v.sku||"SKU-"+Date.now()})});
  await refresh();toast("Item added");
 });
}
function purchaseDialog(){
 if(!db.products.length){toast("Add a product first");return}
 showDialog("Receive stock",`<label>Product<select name="productId">${db.products.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}</select></label>${field("Supplier","supplier","text","Supplier name")}${field("Quantity","qty","number","1")}${field("Unit cost","unitCost","number","0")}`,async v=>{
  await api("/api/purchase-stock",{method:"POST",body:JSON.stringify({...v,qty:Number(v.qty),unitCost:Number(v.unitCost)})});await refresh();toast("Stock received");
 });
}
function personDialog(){
 const kind=$("#peopleType").value;
 showDialog(kind==="customers"?"Add customer":"Add supplier",[
  field("Name","name","text","Full name"),field("Phone","phone","tel","Phone number"),
  field("Email","email","email","Email address"),field("Address / notes","address","text","Optional")
 ].join(""),async v=>{if(!v.name.trim())throw Error("Name is required");await api("/api/"+kind,{method:"POST",body:JSON.stringify(v)});await refresh();toast("Record added")});
}
function expenseDialog(){
 showDialog("Add expense",[field("Description","name","text","Expense title"),selectField("Category","category",["Rent","Utilities","Salary","Transport","Supplies","Other"]),field("Amount","amount","number","0")].join(""),async v=>{if(!v.name.trim()||Number(v.amount)<=0)throw Error("Enter a description and valid amount");await api("/api/expenses",{method:"POST",body:JSON.stringify({...v,amount:Number(v.amount)})});await refresh();toast("Expense saved")});
}
async function completeSale(){
 if(!cart.length)return toast("Add at least one item");
 try{
  const sale=await api("/api/checkout",{method:"POST",body:JSON.stringify({items:cart.map(x=>({productId:x.id,qty:x.qty})),customer:$("#saleCustomer").value||"Walk-in customer",discount:Number($("#discount").value||0),payment:$("#paymentMethod").value})});
  cart=[];$("#discount").value=0;await refresh();renderCart();toast("Sale completed · "+sale.id);printReceipt(sale);
 }catch(e){toast(e.message)}
}
function printReceipt(s){
 const w=window.open("","_blank");if(!w){toast("Allow pop-ups to print receipts");return}
 w.document.write(`<html><head><title>${s.id}</title><style>body{font:14px Arial;padding:25px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}.right{text-align:right}</style></head><body><h2>${escapeHtml(db.settings.businessName)}</h2><p>Receipt: ${s.id}</p><p>${new Date(s.createdAt).toLocaleString()}</p><p>Customer: ${escapeHtml(s.customer)}</p><table><tr><th>Item</th><th>Qty</th><th>Total</th></tr>${s.items.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td>${i.qty}</td><td>${money(i.price*i.qty)}</td></tr>`).join("")}</table><p class="right">Subtotal: ${money(s.subtotal)}</p><p class="right">Discount: ${money(s.discount)}</p><h3 class="right">Total: ${money(s.total)}</h3><p>Payment: ${escapeHtml(s.payment)}</p><center>Thank you</center><script>window.print()<\/script></body></html>`);w.document.close();
}
function renderAll(){
 const total=db.sales.reduce((s,x)=>s+x.total,0),expenses=db.expenses.reduce((s,x)=>s+Number(x.amount),0),cost=db.sales.reduce((s,x)=>s+Number(x.cost||0),0);
 $("#statRevenue").textContent=money(total);$("#statSales").textContent=db.sales.length;$("#statProducts").textContent=db.products.length;$("#statPeople").textContent=db.customers.length+(db.settings.businessType==="hospital"?db.patients.length:0);
 $("#recentTable").innerHTML=db.sales.slice(0,6).map(s=>`<tr><td><b>${s.id}</b></td><td>${new Date(s.createdAt).toLocaleDateString()}</td><td>${s.items.length} line items</td><td><b>${money(s.total)}</b></td></tr>`).join("")||emptyRow(4);
 $("#quickActions").innerHTML=[["＋","New sale","pos"],["◇","Add product","products"],["♙","Directory","people"],["⌁","Reports","reports"]].map(x=>`<button class="quick-action" data-quick="${x[2]}"><span>${x[0]}</span>${x[1]}</button>`).join("");
 $$("[data-quick]").forEach(b=>b.onclick=()=>go(b.dataset.quick));
 const low=db.products.filter(p=>Number(p.stock)<=Number(p.minStock));
 $("#stockWatch").innerHTML=low.length?low.slice(0,8).map(p=>`<span class="stock-chip warning">${escapeHtml(p.name)} · ${p.stock} left</span>`).join(""):'<span class="muted">No low-stock items.</span>';
 const categories=[...new Set(db.products.map(p=>p.category).filter(Boolean))];
 const opts='<option value="">All categories</option>'+categories.map(x=>`<option>${escapeHtml(x)}</option>`).join("");
 $("#posCategory").innerHTML=opts;$("#productFilter").innerHTML=opts;
 $("#invCount").textContent=db.products.length;$("#lowCount").textContent=low.length;$("#stockValue").textContent=money(db.products.reduce((s,p)=>s+p.stock*p.cost,0));
 $("#inventoryTable").innerHTML=db.products.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.sku)}</td><td>${p.stock}</td><td>${p.minStock||0}</td><td><span class="stock-status ${p.stock<=0?"out":p.stock<=p.minStock?"low":""}">${p.stock<=0?"Out of stock":p.stock<=p.minStock?"Low stock":"In stock"}</span></td></tr>`).join("")||emptyRow(5);
 renderProducts();renderCatalog();renderPeople();renderSales();renderExpenses();renderReports();renderCart();
 if($("#page-special").classList.contains("active"))configureSpecial();
 $("#settingName").value=db.settings.businessName||"";$("#settingOwner").value=db.settings.ownerName||"";$("#settingCurrency").value=db.settings.currency||"PKR";
}
function emptyRow(n){return `<tr><td class="empty-row" colspan="${n}">No records yet</td></tr>`}
function renderProducts(){
 const q=($("#productSearch")?.value||"").toLowerCase(),cat=$("#productFilter")?.value||"";
 $("#productsTable").innerHTML=db.products.filter(p=>(p.name+" "+p.sku).toLowerCase().includes(q)&&(!cat||p.category===cat)).map(p=>`<tr><td><b>${escapeHtml(p.name)}</b></td><td>${escapeHtml(p.sku)}</td><td>${escapeHtml(p.category)}</td><td>${money(p.price)}</td><td>${money(p.cost)}</td><td>${p.stock}</td><td><button class="text-btn" data-delete-product="${p.id}">Delete</button></td></tr>`).join("")||emptyRow(7);
 $$("[data-delete-product]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this item?")){await api("/api/products/"+b.dataset.deleteProduct,{method:"DELETE"});await refresh();toast("Item deleted")}});
}
function renderCatalog(){
 const q=($("#posSearch")?.value||"").toLowerCase(),cat=$("#posCategory")?.value||"";
 $("#catalog").innerHTML=db.products.filter(p=>(p.name+" "+p.sku).toLowerCase().includes(q)&&(!cat||p.category===cat)&&p.stock>0).map(p=>`<button class="catalog-item" data-add="${p.id}"><div class="catalog-emoji">📦</div><b>${escapeHtml(p.name)}</b><small>${p.stock} in stock · ${escapeHtml(p.sku)}</small><strong>${money(p.price)}</strong></button>`).join("")||'<div class="empty-state">No items available. Add products first.</div>';
 $$("[data-add]").forEach(b=>b.onclick=()=>{const p=db.products.find(x=>x.id===b.dataset.add);const item=cart.find(x=>x.id===p.id);if(item)item.qty++;else cart.push({id:p.id,name:p.name,price:Number(p.price),qty:1,stock:Number(p.stock)});if(item&&item.qty>p.stock)item.qty--;renderCart()});
}
function renderCart(){
 if(!$("#cartLines"))return;
 $("#cartLines").innerHTML=cart.map(x=>`<div class="cart-line"><div><b>${escapeHtml(x.name)}</b><small>${money(x.price)} each</small></div><div class="qty"><button data-qty="${x.id}" data-delta="-1">−</button>${x.qty}<button data-qty="${x.id}" data-delta="1">+</button></div><b>${money(x.price*x.qty)}</b></div>`).join("")||'<div class="empty-state">Your order is empty.</div>';
 $$("[data-qty]").forEach(b=>b.onclick=()=>{const x=cart.find(i=>i.id===b.dataset.qty);const p=db.products.find(i=>i.id===x.id);x.qty+=Number(b.dataset.delta);if(x.qty<=0)cart=cart.filter(i=>i!==x);if(x.qty>p.stock)x.qty=p.stock;renderCart()});
 const sub=cart.reduce((s,x)=>s+x.price*x.qty,0),discount=Math.max(0,Math.min(sub,Number($("#discount").value||0)));
 $("#cartCount").textContent=cart.reduce((s,x)=>s+x.qty,0)+" items";$("#subtotal").textContent=money(sub);$("#grandTotal").textContent=money(sub-discount);
}
function renderPeople(){
 const type=$("#peopleType").value,q=($("#peopleSearch").value||"").toLowerCase();
 $("#peopleHeading").textContent=type==="customers"?"Customers":"Suppliers";
 $("#peopleTable").innerHTML=db[type].filter(x=>(x.name+" "+x.phone).toLowerCase().includes(q)).map(x=>`<tr><td><b>${escapeHtml(x.name)}</b></td><td>${escapeHtml(x.phone)}</td><td>${escapeHtml(x.email)}</td><td>${escapeHtml(x.address)}</td><td><button class="text-btn" data-delete-person="${x.id}">Delete</button></td></tr>`).join("")||emptyRow(5);
 $$("[data-delete-person]").forEach(b=>b.onclick=async()=>{if(confirm("Delete this record?")){await api("/api/"+type+"/"+b.dataset.deletePerson,{method:"DELETE"});await refresh()}});
}
function renderSales(){
 $("#salesTable").innerHTML=db.sales.map(s=>`<tr><td><b>${s.id}</b></td><td>${new Date(s.createdAt).toLocaleDateString()}</td><td>${escapeHtml(s.customer)}</td><td>${escapeHtml(s.payment)}</td><td><b>${money(s.total)}</b></td><td><button class="text-btn" data-print="${s.id}">Print</button></td></tr>`).join("")||emptyRow(6);
 $$("[data-print]").forEach(b=>b.onclick=()=>printReceipt(db.sales.find(s=>s.id===b.dataset.print)));
}
function renderExpenses(){
 $("#expensesTable").innerHTML=db.expenses.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(x.category)}</td><td>${new Date(x.createdAt).toLocaleDateString()}</td><td>${money(x.amount)}</td><td><button class="text-btn" data-delete-expense="${x.id}">Delete</button></td></tr>`).join("")||emptyRow(5);
 $$("[data-delete-expense]").forEach(b=>b.onclick=async()=>{if(confirm("Delete expense?")){await api("/api/expenses/"+b.dataset.deleteExpense,{method:"DELETE"});await refresh()}});
}
function renderReports(){
 const revenue=db.sales.reduce((s,x)=>s+x.total,0),expenses=db.expenses.reduce((s,x)=>s+Number(x.amount),0),cost=db.sales.reduce((s,x)=>s+Number(x.cost||0),0);
 $("#reportRevenue").textContent=money(revenue);$("#reportExpenses").textContent=money(expenses);$("#reportProfit").textContent=money(revenue-cost-expenses);
 $("#reportTable").innerHTML=db.sales.map(s=>`<tr><td>${s.id}</td><td>${new Date(s.createdAt).toLocaleDateString()}</td><td>${s.items.length}</td><td>${escapeHtml(s.payment)}</td><td>${money(s.total)}</td></tr>`).join("")||emptyRow(5);
}
async function refresh(){db=await api("/api/data");renderAll()}
async function saveSettings(){
 await api("/api/settings",{method:"PUT",body:JSON.stringify({businessName:$("#settingName").value,ownerName:$("#settingOwner").value,currency:$("#settingCurrency").value})});
 await refresh();$("#workspaceName").textContent=db.settings.businessName;toast("Settings saved");
}
function backup(){
 const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="smart-pos-backup.json";a.click();URL.revokeObjectURL(a.href);
}
async function resetWorkspace(){
 if(!confirm("Permanently clear all local demo records? Download a backup first if needed."))return;
 await api("/api/reset",{method:"POST",body:"{}"});db=await api("/api/data");cart=[];$("#app").classList.add("hidden");$("#onboarding").classList.remove("hidden");toast("Workspace reset");
}
function exportSales(){
 const rows=[["Reference","Date","Customer","Payment","Total"],...db.sales.map(s=>[s.id,s.createdAt,s.customer,s.payment,s.total])];
 const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="sales-report.csv";a.click();URL.revokeObjectURL(a.href);
}
init();