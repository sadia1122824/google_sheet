function showChart(l1,l2,l3,p1,p2,p3,c1,c2,c3) 
{
  

var options = {
            chart: {
              type: 'radialBar',
              height: 200,
              dropShadow: {
                enabled: true,
                top: 5,
                left: 0,
                bottom: 0,
                right: 0,
                blur: 5,
                color: '#45404a2e',
                opacity: 0.35
              },
            },

          plotOptions: 
          {
              radialBar: 
              {
                  offsetY: -10,
                  startAngle: 0,
                  endAngle: 270,
                  hollow: 
                  {
                    margin: 5,
                    size: '50%',
                    background: 'transparent',  
                  },

                  track: 
                  {
                    show: false,
                  },

                  dataLabels: 
                  {
                    name: 
                    {
                        fontSize: '18px',
                    },

                    value: 
                    {
                        fontSize: '16px',
                        color: '#50649c',
                    },
                  }
              },
          },
  colors: [c1,c2,c3],
  stroke: {  lineCap: 'round'  },
  series: [p1,p2,p3],
  labels: [l1,l2,l3],
  legend: {
    show: true,
    floating: true,
    position: 'left',
    offsetX: -10,
    offsetY: 0,
          },

  responsive: 
  [{
      breakpoint: 480,
      options: 
      {
          legend: {
              show: true,
              floating: true,
              position: 'left',
              offsetX: 10,
              offsetY: 0,
          }
      }
  }]
}


var chart = new ApexCharts(document.querySelector("#task_status"),options);
chart.render();

}