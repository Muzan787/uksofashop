import https from 'node:https'
import fs from 'node:fs'
import crypto from 'node:crypto'

const key=fs.readFileSync('/tmp/phasec-key.pem')
const cert=fs.readFileSync('/tmp/phasec-cert.pem')
const PROD='https://nznpeqjnoobhyxwnmsez.supabase.co'
const PUB='sb_publishable_tMk28Ay_hIljhv8NQcV01Q_cI9ApS9c'
const byVisitor=new Map(),byToken=new Map()
const products=new Map([
 ['1ba97d1f-f890-48f8-8ab9-57cbb147f388',[999,'ELECTRIC']],
 ['4b6dc9c2-91ec-432f-9735-abb6899b1a95',[350,'ROMA']],
 ['ff3c0414-77ba-40ef-b6b2-bd97bff2bd17',[649,'STANDARD']],
 ['01921b2b-5fe9-47d3-8eb6-b53adba27e82',[349,'EXCLUDED']],
 ['f262accc-1287-4375-984e-e677afd5aa01',[149,'EXCLUDED']],
 ['a5d2050d-c458-4e0c-b3b3-7b7c727845a0',[549,'EXCLUDED']],
])
const priority={ELECTRIC:4,ROMA:3,STANDARD:2,EXCLUDED:1}
const amountFor={ELECTRIC:50,ROMA:30,STANDARD:20,EXCLUDED:0}
function cors(req){const o=req.headers.origin==='https://localhost:3443'?req.headers.origin:'https://localhost:3443';return {'access-control-allow-origin':o,'access-control-allow-credentials':'true','access-control-allow-headers':'authorization,apikey,content-type,prefer,range,x-client-info,x-supabase-api-version','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','vary':'Origin'}}
function send(req,res,status,data,extra={}){res.writeHead(status,{'content-type':'application/json',...cors(req),...extra});res.end(JSON.stringify(data))}
async function body(req){let s='';for await(const c of req)s+=c;if(!s)return{};try{return JSON.parse(s)}catch{return{}}}
function active(e){return !!e&&!e.revoked_at&&Date.parse(e.expires_at)>Date.now()}

https.createServer({key,cert},async(req,res)=>{
 const u=new URL(req.url,'https://localhost:5443')
 if(req.method==='OPTIONS')return send(req,res,204,{})
 if(u.pathname==='/__qa/state')return send(req,res,200,{visitors:byVisitor.size,tokens:byToken.size})
 if(u.pathname==='/__qa/reset'&&req.method==='POST'){byVisitor.clear();byToken.clear();return send(req,res,200,{ok:true})}
 if(u.pathname==='/__qa/expire-all'&&req.method==='POST'){for(const e of byToken.values())e.expires_at=new Date(Date.now()-60000).toISOString();return send(req,res,200,{ok:true,count:byToken.size})}
 if(u.pathname==='/rest/v1/rpc/issue_paid_offer_entitlement'&&req.method==='POST'){
  const b=await body(req),now=new Date();let e=byVisitor.get(b.p_visitor_id)
  if(!active(e)){e={token:crypto.randomUUID(),visitor_id:b.p_visitor_id,source:b.p_source,started_at:now.toISOString(),expires_at:new Date(now.getTime()+7*864e5).toISOString(),revoked_at:null};byVisitor.set(b.p_visitor_id,e);byToken.set(e.token,e)}
  else{e.source=b.p_source;e.expires_at=new Date(now.getTime()+7*864e5).toISOString()}
  return send(req,res,200,{token:e.token,source:e.source,started_at:e.started_at,expires_at:e.expires_at})
 }
 if(u.pathname==='/rest/v1/offer_entitlements'&&req.method==='GET'){
  const raw=u.searchParams.get('token')||'',tok=raw.startsWith('eq.')?raw.slice(3):raw,e=byToken.get(tok)
  return send(req,res,200,e?[{source:e.source,started_at:e.started_at,expires_at:e.expires_at,revoked_at:e.revoked_at}]:[])
 }
 if(u.pathname==='/rest/v1/rpc/calculate_order_offer'&&req.method==='POST'){
  const b=await body(req),items=Array.isArray(b.p_items)?b.p_items:[],code=String(b.p_promotion_code||'').trim().toUpperCase(),codeValid=code==='SOFAEXTRA',entValid=active(byToken.get(b.p_offer_entitlement_token));let subtotal=0,tier=null
  for(const item of items){const p=products.get(item.variant_id);if(!p)continue;const qty=Math.min(Math.max(Number(item.quantity)||1,1),99);subtotal+=p[0]*qty;if(!tier||priority[p[1]]>priority[tier])tier=p[1]}
  const valid=codeValid||entValid,discount=valid&&tier?Math.min(subtotal,amountFor[tier]||0):0
  return send(req,res,200,{items_subtotal:subtotal,code_valid:codeValid,entitlement_valid:entValid,normalized_code:codeValid?'SOFAEXTRA':null,discount_amount:discount,discount_tier:valid?tier:null,promotion_code:codeValid?'SOFAEXTRA':null,offer_source:codeValid?'manual_code':entValid?'paid_entitlement':null})
 }
 if(req.method==='GET'||req.method==='HEAD'){
  try{const target=PROD+u.pathname+u.search,h={};for(const[k,v]of Object.entries(req.headers))if(!['host','authorization','apikey','cookie','origin','referer'].includes(k)&&v)h[k]=v;h.apikey=PUB;h.authorization='Bearer '+PUB;const r=await fetch(target,{method:req.method,headers:h}),buf=Buffer.from(await r.arrayBuffer()),out={};for(const[k,v]of r.headers)if(!['content-encoding','transfer-encoding','content-length','access-control-allow-origin'].includes(k))out[k]=v;Object.assign(out,cors(req));res.writeHead(r.status,out);return res.end(buf)}catch{return send(req,res,502,{error:'read-only fixture upstream failed'})}
 }
 return send(req,res,201,[])
}).listen(5443,'127.0.0.1',()=>console.log('[QA_BACKEND] ready'))
