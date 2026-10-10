import { z } from 'zod'
import { JOURNEY_KINDS, JOURNEY_VERSION, PAGE_TYPES, SURFACES, publicJourneyPath, journeyPage } from './journeyContract'
const path=z.string().max(256).refine(v=>publicJourneyPath(v)===v)
export const journeyMetadataSchema=z.object({
  surface:z.enum(SURFACES).optional(),
  section:z.enum(['price','configuration','fabric','dimensions','delivery','reviews','faq','primary','sticky']).optional(),
  option_code:z.string().max(40).regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/).optional(),
  step:z.enum(['cart','delivery','success','seats','size','design','fabric','feet','piping','notes','summary']).optional(),
  outcome:z.enum(['success','failed','requires_fabric','missing_variant','selected','opened','closed','submitted','mainland_success','custom_quote','invalid','not_found','network_error','available','valid','error']).optional(),
  extra:z.enum(['upstairs','lift','assembly','sofa_removal']).optional(),
  enabled:z.boolean().optional(),
  source_product_id:z.string().uuid().optional(),
  error_code:z.enum(['required','invalid_format','invalid_mobile','invalid_postcode','address_missing','delivery_unavailable','server_error','unknown']).optional(),
  field:z.enum(['name','email','phone','postcode','address','special_instructions']).optional(),
  depth:z.union([z.literal(25),z.literal(50),z.literal(75),z.literal(90)]).optional(),
  engaged_ms:z.number().int().min(0).max(86400000).optional(),
  quantity:z.number().int().min(0).max(100).optional(),
  price:z.number().finite().min(0).max(100000).optional(),
  destination:path.optional(),
}).strict()
export const journeyEventSchema=z.object({
  id:z.string().uuid(),kind:z.enum(JOURNEY_KINDS),path,page_type:z.enum(PAGE_TYPES),
  navigation_id:z.string().uuid(),sequence:z.number().int().min(1).max(200),
  elapsed_ms:z.number().int().min(0).max(86400000),
  device:z.enum(['mobile','tablet','desktop']),qa:z.boolean(),
  product_id:z.string().uuid().optional(),variant_id:z.string().uuid().optional(),
  metadata:journeyMetadataSchema,
}).strict().refine(e=>e.page_type===journeyPage(e.path))
export const journeyBatchSchema=z.object({
  version:z.literal(JOURNEY_VERSION),events:z.array(journeyEventSchema).min(1).max(20),
}).strict()
export function receiptAllowsJourney(receipt: {visitor_id:string;session_id:string;arrival_id:string;analytics_storage:string;policy_version:string}|null,
  identity:{visitor:string;session:string;arrival:string}) {
  return !!receipt && receipt.visitor_id===identity.visitor && receipt.session_id===identity.session &&
    receipt.arrival_id===identity.arrival && receipt.analytics_storage==='granted' &&
    receipt.policy_version==='ukss-google-2026-09-27-v1'
}
