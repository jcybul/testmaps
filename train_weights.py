import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

df = pd.read_csv('joint.csv')
cols = df[["Code",'Housing','Population','Income','Stars']]
drop = cols.dropna(axis=0)
predict = cols[cols['Stars'].isnull()]
Y_p = predict[['Housing','Population','Income']].to_numpy()

labels = drop["Stars"].to_numpy()
X = drop[['Housing', 'Population','Income']].to_numpy()

model = LinearRegression()
model.fit(X, labels)
s = model.predict(Y_p)
pred = []
for i in range(len(s)):
    if s[i] < 0:
        s[i] = 0
    else:
        s[i] = int(s[i])

predict["Stars"] = s.tolist()

final = predict[["Code","Stars"]]
final.columns = ["Code","Predicted_Stars"]

m = df.merge(final, left_on='Code', right_on='Code',how="outer")
m.to_csv("joint.csv",index=False)



