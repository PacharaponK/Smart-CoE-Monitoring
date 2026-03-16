import json
import boto3

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    bucket_name = 'smart-coe-images' # เปลี่ยนเป็นชื่อ Bucket ของคุณ
    
    try:
        # ดึงรายชื่อไฟล์ในโฟลเดอร์ images/
        response = s3.list_objects_v2(Bucket=bucket_name, Prefix='images/')
        
        image_urls = []
        
        # ตรวจสอบว่ามีไฟล์หรือไม่
        if 'Contents' in response:
            # เรียงลำดับจากใหม่ไปเก่า (ออปชันเสริม)
            sorted_contents = sorted(response['Contents'], key=lambda k: k['LastModified'], reverse=True)
            
            for item in sorted_contents:
                # ข้ามถ้าเป็นแค่ชื่อโฟลเดอร์เปล่าๆ
                if item['Key'] == 'images/':
                    continue
                    
                # สร้าง Pre-signed URL สำหรับดูรูป (GET) อายุ 1 ชั่วโมง
                url = s3.generate_presigned_url('get_object',
                                                Params={'Bucket': bucket_name, 'Key': item['Key']},
                                                ExpiresIn=3600)
                image_urls.append(url)
                
        return {
            'statusCode': 200,
            # ต้องใส่ CORS Headers เพื่อให้ React เรียกใช้งานได้
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,GET'
            },
            'body': json.dumps({'images': image_urls})
        }
    except Exception as e:
        return {'statusCode': 500, 'body': str(e)}