#include <math.h>
#include <stdint.h>
#include <stdlib.h>
#define MAX(a,b) ((a)>(b)?(a):(b))
#define MIN(a,b) ((a)<(b)?(a):(b))
static float dot(float *a,float *b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
void paint(int w,int n,int nt,float *v,float *norm,float *color,int *inds,float *screen,float *lightproj,float *lightdepth,float *eye,float *key,float *rim,float *gloss,float *depth,uint8_t *out,int shadow){
for(int f=0;f<nt;f++){int a=inds[f*3],b=inds[f*3+1],c=inds[f*3+2];float *A=screen+3*a,*B=screen+3*b,*C=screen+3*c;
int x0=MAX(0,floorf(MIN(A[0],MIN(B[0],C[0])))),x1=MIN(w-1,ceilf(MAX(A[0],MAX(B[0],C[0]))));
int y0=MAX(0,floorf(MIN(A[1],MIN(B[1],C[1])))),y1=MIN(w-1,ceilf(MAX(A[1],MAX(B[1],C[1]))));
float denom=(B[1]-C[1])*(A[0]-C[0])+(C[0]-B[0])*(A[1]-C[1]);if(fabsf(denom)<1e-5)continue;
for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){float i=((B[1]-C[1])*(x+.5-C[0])+(C[0]-B[0])*(y+.5-C[1]))/denom,j=((C[1]-A[1])*(x+.5-C[0])+(A[0]-C[0])*(y+.5-C[1]))/denom,k=1-i-j;if(i<0||j<0||k<0)continue;
int p=y*w+x;float z=i*A[2]+j*B[2]+k*C[2];if(z<=depth[p])continue;depth[p]=z;if(shadow)continue;
float N[3],L[3],col[3],pos[3];for(int h=0;h<3;h++){N[h]=i*norm[3*a+h]+j*norm[3*b+h]+k*norm[3*c+h];col[h]=i*color[3*a+h]+j*color[3*b+h]+k*color[3*c+h];L[h]=i*lightproj[3*a+h]+j*lightproj[3*b+h]+k*lightproj[3*c+h];pos[h]=i*v[3*a+h]+j*v[3*b+h]+k*v[3*c+h];}
float inv=1/sqrtf(dot(N,N)+1e-6);for(int h=0;h<3;h++)N[h]*=inv;if(dot(N,eye)<0)for(int h=0;h<3;h++)N[h]*=-1;
float vis=0;for(int sy=-1;sy<=1;sy++)for(int sx=-1;sx<=1;sx++){int xx=(int)L[0]+sx,yy=(int)L[1]+sy;vis+=(xx<0||xx>=w||yy<0||yy>=w||L[2]+2.8>lightdepth[yy*w+xx])?1:.28;}
vis/=9;float sp=gloss[a],d=MAX(0,dot(N,key)),r=MAX(0,dot(N,rim)),nv=MAX(0,dot(N,eye)),H[3];for(int h=0;h<3;h++)H[h]=key[h]+eye[h];float hl=MAX(0,dot(N,H)/sqrtf(dot(H,H)));
float shine=powf(hl,20+65*sp)*vis*(.09+.48*sp),edge=powf(1-nv,3)*(.10+.14*sp),ambi=.37+.09*N[1],noise=.97+.030*sinf(134*pos[0]+19*sinf(57*pos[2]))*sinf(81*pos[1]+27*pos[0]);
for(int h=0;h<3;h++){float direct=(h==0?1.03:h==1?.99:.92),cool=(h==0?.45:h==1?.93:1.13);
float lit=col[h]*(ambi+d*.70*vis*direct+r*.21*cool)*noise +shine*(h==2?.88:1)+edge*cool*.45;
out[p*4+h]=(uint8_t)(255*MIN(1,MAX(0,lit)));}out[p*4+3]=255;
}}}
